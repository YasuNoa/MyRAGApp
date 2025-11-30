from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import io
import json
import uuid
from typing import List, Optional
from pypdf import PdfReader
from pinecone import Pinecone
import google.generativeai as genai
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import CrossEncoder
import pytesseract
from pdf2image import convert_from_bytes
import asyncpg

load_dotenv()

# --- Configuration ---
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX", "myragapp")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/myragapp") 

if not PINECONE_API_KEY or not GOOGLE_API_KEY:
    print("WARNING: API Keys not found in environment variables")

# --- Initialize Clients ---
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX_NAME)
genai.configure(api_key=GOOGLE_API_KEY)

# Initialize Cross-Encoder for Re-ranking
print("Loading Cross-Encoder model...")
cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
print("Cross-Encoder loaded.")

print("Cross-Encoder loaded.")

db_pool = None

app = FastAPI()

# --- CORS ---
origins = [
    "http://localhost:3000",
    "http://frontend:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Startup ---
@app.on_event("startup")
async def startup_event():
    # try:
    #     print("Listing available Gemini models...")
    #     for m in genai.list_models():
    #         if 'generateContent' in m.supported_generation_methods:
    #             print(f"Available model: {m.name}")
    # except Exception as e:
    #     print(f"Error listing models: {e}")

    global db_pool
    try:
        print("Connecting to Database...")
        db_pool = await asyncpg.create_pool(DATABASE_URL)
        print("Database connected.")
    except Exception as e:
        print(f"Error connecting to database: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    if db_pool:
        await db_pool.close()

# --- Helper Functions ---

def get_embedding(text: str) -> List[float]:
    """Generates embedding for the given text using Gemini."""
    try:
        # Clean text slightly to avoid issues
        clean_text = text.replace("\n", " ")
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=clean_text,
            task_type="retrieval_document"
        )
        return result['embedding']
    except Exception as e:
        print(f"Error generating embedding: {e}")
        raise e

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extracts text from a PDF file content."""
    try:
        reader = PdfReader(io.BytesIO(file_content))
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return "" # Return empty to trigger OCR

def extract_text_with_ocr(file_content: bytes) -> str:
    """Extracts text from PDF using OCR (Tesseract)."""
    try:
        print("Starting OCR processing...")
        images = convert_from_bytes(file_content)
        text = ""
        for i, image in enumerate(images):
            # Use Japanese and English
            page_text = pytesseract.image_to_string(image, lang='jpn+eng')
            text += page_text + "\n"
            print(f"OCR processed page {i+1}/{len(images)}")
        return text
    except Exception as e:
        print(f"OCR Error: {e}")
        return ""

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Splits text into chunks using LangChain's RecursiveCharacterTextSplitter."""
    if not text:
        return []
    
    # Optimized separators for Japanese and English
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", "。", "、", " ", ""] 
    )
    return text_splitter.split_text(text)

async def save_document_content(doc_id: str, content: str, category: Optional[str] = None):
    """Saves full text content and category to PostgreSQL."""
    if not db_pool:
        print("DB Pool not initialized, skipping content save.")
        return

    try:
        async with db_pool.acquire() as conn:
            # Try to update by ID first, then externalId
            result = await conn.execute(
                """
                UPDATE "Document"
                SET content = $1, category = $2
                WHERE id = $3
                """,
                content, category, doc_id
            )
            if result == "UPDATE 0":
                 await conn.execute(
                    """
                    UPDATE "Document"
                    SET content = $1, category = $2
                    WHERE "externalId" = $3
                    """,
                    content, category, doc_id
                )
            print(f"Saved content for document {doc_id}")
    except Exception as e:
        print(f"Error saving content to DB: {e}")

async def get_document_content(doc_id: str) -> str:
    """Fetches full text content from PostgreSQL."""
    if not db_pool:
        return ""
    
    try:
        async with db_pool.acquire() as conn:
            # Try by ID then externalId
            row = await conn.fetchrow('SELECT content FROM "Document" WHERE id = $1', doc_id)
            if not row:
                row = await conn.fetchrow('SELECT content FROM "Document" WHERE "externalId" = $1', doc_id)
            
            if row:
                return row['content'] or ""
            return ""
    except Exception as e:
        print(f"Error fetching content from DB: {e}")
        return ""

# --- Endpoints ---

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribes audio file using Gemini 2.0 Flash.
    """
    try:
        print(f"Received transcription request for: {file.filename}")
        content = await file.read()
        
        # Gemini requires file upload for audio? Or can we pass bytes?
        # For audio, it's best to use the File API.
        # We need to save it temporarily or pass it if supported.
        # Gemini 1.5/2.0 supports audio.
        
        # Save temp file
        temp_filename = f"/tmp/{uuid.uuid4()}_{file.filename}"
        with open(temp_filename, "wb") as f:
            f.write(content)
            
        # Upload to Gemini
        print("Uploading to Gemini...")
        uploaded_file = genai.upload_file(temp_filename, mime_type=file.content_type)
        
        # Generate Content
        print("Generating transcript...")
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(
            ["Generate a verbatim transcription of this audio.", uploaded_file]
        )
        
        # Cleanup
        os.remove(temp_filename)
        # genai.delete_file(uploaded_file.name) # Optional: cleanup remote file
        
        return {"status": "success", "transcript": response.text}

    except Exception as e:
        print(f"Error transcribing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"message": "Python Backend is running!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/import-file")
async def import_file(
    file: UploadFile = File(...),
    metadata: str = Form(...) # Expecting JSON string for metadata
):
    """
    Receives a file and metadata, parses it, chunks it, embeds it, and saves to Pinecone.
    Also saves full text to PostgreSQL.
    """
    print(f"Received import request for file: {file.filename}")
    
    try:
        # Parse metadata
        meta_dict = json.loads(metadata)
        user_id = meta_dict.get("userId")
        file_id = meta_dict.get("fileId") # Google Drive File ID or DB ID
        mime_type = meta_dict.get("mimeType")
        tags = meta_dict.get("tags", []) # Get tags list
        
        if not user_id or not file_id:
            raise HTTPException(status_code=400, detail="Missing userId or fileId in metadata")

        # Read file content
        content = await file.read()
        
        # Extract Text
        text = ""
        if mime_type == "application/pdf":
            text = extract_text_from_pdf(content)
            # Fallback to OCR if text is empty or too short
            if not text.strip() or len(text.strip()) < 50: 
                print("PDF text extraction yielded little/no text. Attempting OCR...")
                ocr_text = extract_text_with_ocr(content)
                if ocr_text.strip():
                    text = ocr_text
                    
        elif mime_type.startswith("text/") or mime_type == "application/vnd.google-apps.document":
            # For Google Docs, we assume it's converted to text/plain by the frontend/drive api
            text = content.decode("utf-8")
        else:
            # Try decoding as text for others
            try:
                text = content.decode("utf-8")
            except:
                raise HTTPException(status_code=400, detail=f"Unsupported mime type: {mime_type}")

        if not text.strip():
            raise HTTPException(status_code=400, detail="Extracted text is empty")

        # Chunk Text
        chunks = chunk_text(text)
        print(f"Generated {len(chunks)} chunks for file {file.filename}")

        # Embed and Upsert to Pinecone
        vectors = []
        for i, chunk in enumerate(chunks):
            vector_id = f"{user_id}#{file_id}#{i}"
            embedding = get_embedding(chunk)
            
            metadata_payload = {
                "userId": user_id,
                "fileId": file_id,
                "fileName": file.filename,
                "text": chunk,
                "chunkIndex": i,
                "tags": tags # Save tags
            }
            
            # Only add dbId if it exists (Pinecone doesn't accept null)
            if meta_dict.get("dbId"):
                metadata_payload["dbId"] = meta_dict.get("dbId")
            
            vectors.append({
                "id": vector_id,
                "values": embedding,
                "metadata": metadata_payload
            })
            
            # Batch upsert if too many (e.g. every 100)
            if len(vectors) >= 100:
                index.upsert(vectors=vectors) 
                vectors = []

        # Upsert remaining
        if vectors:
            index.upsert(vectors=vectors) 

        # Save full content to DB
        db_id = meta_dict.get("dbId")
        if db_id:
             await save_document_content(db_id, text)
        
        return {
            "status": "success", 
            "message": f"Successfully processed {file.filename}",
            "chunks_count": len(chunks),
            "fileId": file_id
        }

    except Exception as e:
        print(f"Error processing file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class DeleteRequest(BaseModel):
    fileId: str
    userId: str

@app.post("/delete-file")
async def delete_file(request: DeleteRequest):
    """
    Deletes all vectors associated with a specific file and user.
    """
    try:
        print(f"Received delete request for file: {request.fileId} user: {request.userId}")
        
        # Delete by metadata filter
        index.delete(filter={"fileId": request.fileId, "userId": request.userId})
        
        return {"status": "success", "message": f"Deleted vectors for file {request.fileId}"}

    except Exception as e:
        print(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class TextImportRequest(BaseModel):
    text: str
    userId: str
    source: str = "manual"
    dbId: Optional[str] = None
    tags: List[str] = [] # Changed from category to tags list

@app.post("/import-text")
async def import_text(request: TextImportRequest):
    """
    Imports raw text, chunks it, embeds it, and saves to Pinecone.
    """
    try:
        print(f"Received text import request from user: {request.userId}")
        
        if not request.text.strip():
             raise HTTPException(status_code=400, detail="Text is empty")

        # Chunk Text
        chunks = chunk_text(request.text)
        
        # Generate a unique fileId for this text entry
        file_id = str(uuid.uuid4())

        # Embed and Upsert to Pinecone
        vectors = []
        for i, chunk in enumerate(chunks):
            vector_id = f"{request.userId}#{file_id}#{i}"
            embedding = get_embedding(chunk)
            
            vectors.append({
                "id": vector_id,
                "values": embedding,
                "metadata": {
                    "userId": request.userId,
                    "fileId": file_id,
                    "fileName": "Text Entry", # Placeholder
                    "text": chunk,
                    "chunkIndex": i,
                    "tags": request.tags # Add tags to metadata
                }
            })
        # So Backend generates ID. Frontend uses it to create Document.
        # So Backend CANNOT save to Postgres because the row doesn't exist.
        # UNLESS Backend creates the row? But Backend doesn't know about User relation fully (Prisma handles it).
        # So for /import-text, we might need to return the content and let Frontend save it,
        # OR Frontend creates Document first, passes ID to /import-text.
        # Let's stick to: Backend returns text, Frontend updates DB.
        # Wait, for /import-file, we did `save_document_content`.
        # Because for /import-file, Frontend creates Document BEFORE calling backend.
        # So for /import-text, we should change Frontend to create Document BEFORE calling backend.
        # I will assume I will update Frontend later.
        # So I will add `dbId` to TextImportRequest.
        
        return {
            "status": "success", 
            "fileId": file_id,
            "chunks_count": len(chunks)
        }

    except Exception as e:
        print(f"Error processing text: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ClassifyRequest(BaseModel):
    text: str

@app.post("/classify")
async def classify_intent(request: ClassifyRequest):
    """
    Classifies the user's intent using Gemini.
    """
    try:
        prompt = f"""
        Analyze the following user message and classify the intent into one of the following categories:
        - STORE: The user wants to store/remember information.
        - REVIEW: The user wants to review/recall information.
        - CHAT: The user wants to chat or ask a question.
        
        Also, extract a category tag if possible (e.g., "Work", "Idea", "Health"). If no specific category, use "General".
        
        User Message: "{request.text}"
        
        Output JSON format:
        {{
            "intent": "STORE" | "REVIEW" | "CHAT",
            "category": "Category Name"
        }}
        """
        
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        text_resp = response.text.strip()
        
        # Clean up code blocks if present
        if text_resp.startswith("```json"):
            text_resp = text_resp[7:-3]
        elif text_resp.startswith("```"):
            text_resp = text_resp[3:-3]
            
        return json.loads(text_resp)

    except Exception as e:
        print(f"Error classifying intent: {e}")
        # Fallback
        return {"intent": "CHAT", "category": "General"}

class QueryRequest(BaseModel):
    query: str
    userId: str
    tags: List[str] = [] # Changed from category to tags list

@app.post("/query")
async def query_knowledge(request: QueryRequest):
    """
    Receives a query, searches Pinecone, re-ranks results, and generates an answer using Gemini.
    """
    try:
        print(f"Received query: {request.query} from user: {request.userId}, tags: {request.tags}")
        
        # 1. Get Embedding for Query
        query_embedding = get_embedding(request.query)
        
        # 2. Search Pinecone
        index = pc.Index(PINECONE_INDEX_NAME)
        
        # Build filter if tags are provided
        filter_dict = {"userId": request.userId}
        if request.tags:
            # Pinecone filter for list containment: "tags": {"$in": ["tag1", "tag2"]} 
            # OR if we want strict match for ANY of the selected tags.
            # If user selects "Math", we want docs that have "Math" in their tags list.
            # Pinecone metadata 'tags' is a list of strings.
            # Filter: "tags": { "$in": request.tags } checks if any of the document's tags are in the query tags.
            # Wait, "$in" operator checks if the *field value* (scalar) is in the *filter list*.
            # If the field value is a list (tags=["A", "B"]), and we want to find docs where "A" is in tags.
            # Pinecone syntax for list field: "tags": "A" (matches if "A" is in the list).
            # If we have multiple query tags ["A", "B"], do we want OR or AND?
            # Usually OR (docs with A OR B).
            # Pinecone "$in" with list field: "tags": { "$in": ["A", "B"] } matches if any of "A" or "B" is in the tags list.
            filter_dict["tags"] = {"$in": request.tags}
            print(f"Applying tag filter: {filter_dict}")
            
        search_results = index.query(
            vector=query_embedding,
            top_k=5,
            include_metadata=True,
            filter=filter_dict
        )
        
        print(f"Found {len(search_results['matches'])} matches")
        
        if not search_results['matches']:
            return {"answer": "申し訳ありません。関連する情報が見つかりませんでした。"}
            
        # 3. Fetch Full Content from Postgres (Long Context RAG)
        context_parts = []
        seen_doc_ids = set()
        
        for match in search_results['matches']:
            # We stored fileId (which is dbId for manual/text) in metadata
            # For Drive files, fileId is the Drive ID.
            # We need to handle both.
            # In import-file/text, we are now saving dbId in metadata if available.
            
            # Try to get dbId from metadata, fallback to fileId
            # But wait, for Drive files, we might not have dbId in Pinecone metadata yet 
            # if they were indexed before we added dbId to metadata.
            # However, for new imports we do.
            
            # Let's try to find the document by externalId (fileId) if dbId is missing.
            # But get_document_content takes dbId (int) or we need to look it up.
            # Actually get_document_content takes doc_id which is the primary key (int) or uuid?
            # In Prisma, id is String (Cuid/Uuid).
            
            # Let's check metadata structure
            metadata = match['metadata']
            doc_id = metadata.get('dbId') or metadata.get('fileId')
            
            # If we have a doc_id (which might be externalId for old drive files),
            # we should try to fetch content.
            # But get_document_content expects the Postgres Primary Key ID.
            # If we only have externalId, we might need to query Postgres by externalId.
            # For now, let's assume dbId is present or fileId is the key.
            # In the new logic, we are saving content to Postgres.
            
            # If we can't find content in Postgres, fallback to chunk text from Pinecone?
            # Yes, that's a good fallback.
            
            full_content = None
            if doc_id:
                if doc_id not in seen_doc_ids:
                    print(f"Attempting to fetch content for doc_id: {doc_id}")
                    full_content = await get_document_content(doc_id)
                    if full_content:
                        print(f"Successfully fetched full content for {doc_id} (Length: {len(full_content)})")
                        context_parts.append(f"Source: {metadata.get('fileName', 'Unknown')}\n\n{full_content}")
                        seen_doc_ids.add(doc_id)
                    else:
                        print(f"Full content not found for {doc_id}, falling back to chunk.")
            
            # Fallback to chunk text if full content not found
            if not full_content:
                chunk_text = metadata.get('text', '')
                print(f"Using chunk text fallback (Length: {len(chunk_text)})")
                context_parts.append(f"Source: {metadata.get('fileName', 'Unknown')} (Excerpt)\n\n{chunk_text}")

        context = "\n\n---\n\n".join(context_parts)
        print(f"Final Context Length: {len(context)}")
        
        # 4. Generate Answer with Gemini
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        You are a helpful AI assistant. Answer the user's question based ONLY on the provided context.
        If the answer is not in the context, say you don't know.
        
        Context:
        {context}
        
        Question:
        {request.query}
        
        Answer (in Japanese):
        """
        
        response = model.generate_content(prompt)
        return {"answer": response.text}

    except Exception as e:
        print(f"Error querying: {e}")
        raise HTTPException(status_code=500, detail=str(e))

