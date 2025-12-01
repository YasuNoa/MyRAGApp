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
from langchain_text_splitters import RecursiveCharacterTextSplitter
# from sentence_transformers import CrossEncoder # REMOVED for lightweight
# import pytesseract # REMOVED for lightweight
# from pdf2image import convert_from_bytes # REMOVED for lightweight
import asyncpg
import logging
import sys
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

load_dotenv()

# --- Configuration ---
# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX", "myragapp")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/myragapp") 

if not PINECONE_API_KEY or not GOOGLE_API_KEY:
    logger.warning("API Keys not found in environment variables")

# --- Initialize Clients ---
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX_NAME)
genai.configure(api_key=GOOGLE_API_KEY)

# Initialize Cross-Encoder for Re-ranking
# logger.info("Loading Cross-Encoder model...")
# cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
# logger.info("Cross-Encoder loaded.")

db_pool = None

app = FastAPI()

class TextImportRequest(BaseModel):
    text: str
    userId: str
    source: str = "manual"
    dbId: Optional[str] = None
    tags: List[str] = [] # Changed from category to tags list
    summary: Optional[str] = None

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
        logger.info("Connecting to Database...")
        db_pool = await asyncpg.create_pool(DATABASE_URL)
        logger.info("Database connected.")
    except Exception as e:
        logger.error(f"Error connecting to database: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    if db_pool:
        await db_pool.close()

# --- Helper Functions ---

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception)
)
def get_embedding(text: str) -> List[float]:
    # Generates embedding for the given text using Gemini.
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
        logger.error(f"Error generating embedding: {e}")
        raise e

def extract_text_from_pdf(file_content: bytes) -> str:
    # Extracts text from a PDF file content.
    try:
        reader = PdfReader(io.BytesIO(file_content))
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        return "" 

async def _process_pdf_with_gemini(content: bytes) -> str:
    # Uploads PDF to Gemini 2.0 Flash for text extraction (OCR).
    temp_filename = f"/tmp/{uuid.uuid4()}.pdf"
    try:
        with open(temp_filename, "wb") as f:
            f.write(content)
        
        logger.info("Uploading PDF to Gemini for OCR...")
        uploaded_file = genai.upload_file(temp_filename, mime_type="application/pdf")
        
        logger.info("Generating PDF transcript...")
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = "Transcribe all text in this document verbatim. Ignore layout, just output the text."
        response = model.generate_content([prompt, uploaded_file])
        return response.text
    except Exception as e:
        logger.error(f"Error processing PDF with Gemini: {e}")
        return ""
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 150) -> List[str]:
    # Splits text into chunks using LangChain's RecursiveCharacterTextSplitter.
    if not text:
        return []
    
    # Optimized separators for Japanese and English
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", "。", "、", " ", ""] 
    )
    return text_splitter.split_text(text)

async def save_document_content(
    doc_id: str, 
    content: str, 
    category: Optional[str] = None, 
    summary: Optional[str] = None,
    mime_type: Optional[str] = None
):
    # Saves full text content, category, summary, and mimeType to PostgreSQL.
    if not db_pool:
        logger.warning("DB Pool not initialized, skipping content save.")
        return

    try:
        async with db_pool.acquire() as conn:
            # Try to update by ID first, then externalId
            # Note: category field might not exist in Document model based on schema.prisma check earlier?
            # Let's check schema again. Document has: id, userId, title, content, summary, type, tags, source, externalId, createdAt, mimeType.
            # It does NOT have 'category'. 'type' defaults to 'knowledge'.
            # The previous code was trying to save 'category'. This might have been failing silently or I missed it.
            # Wait, the schema I viewed earlier:
            # model Document { ... type String @default("knowledge") ... }
            # So 'category' param probably maps to 'type' or is ignored?
            # In the previous code: SET content = $1, category = $2 ...
            # If 'category' column doesn't exist, this SQL would fail.
            # Let's assume 'category' was intended to be 'type' or it's a mistake.
            # However, I should focus on adding 'mimeType'.
            # I will check if 'category' column exists in the schema I read.
            # Schema: type String @default("knowledge")
            # There is NO 'category' column in Document.
            # So the existing code MUST be failing if it tries to update 'category'.
            # But I didn't see errors in logs? Maybe it wasn't called or I missed it.
            # I will replace 'category' with 'mimeType' in the update, and remove 'category' from SQL if it doesn't exist.
            # Actually, let's look at the schema again.
            # Document: id, userId, title, content, summary, type, tags, source, externalId, createdAt, mimeType.
            # I will update the SQL to update 'content', 'summary', and 'mimeType'.
            
            query = """
                UPDATE "Document"
                SET content = $1, summary = $2, "mimeType" = $3
                WHERE id = $4
            """
            result = await conn.execute(query, content, summary, mime_type, doc_id)
            
            if result == "UPDATE 0":
                 query_ext = """
                    UPDATE "Document"
                    SET content = $1, summary = $2, "mimeType" = $3
                    WHERE "externalId" = $4
                """
                 await conn.execute(query_ext, content, summary, mime_type, doc_id)
                 
            if result == "UPDATE 0":
                 query_ext = """
                    UPDATE "Document"
                    SET content = $1, summary = $2, "mimeType" = $3
                    WHERE "externalId" = $4
                """
                 await conn.execute(query_ext, content, summary, mime_type, doc_id)
                 
            logger.info(f"Saved content for document {doc_id}")
    except Exception as e:
        logger.error(f"Error saving content to DB: {e}")

async def get_document_content(doc_id: str) -> str:
    # Fetches full text content from PostgreSQL.
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
        logger.error(f"Error fetching content from DB: {e}")
        return ""

# --- Endpoints ---

@app.post("/process-voice-memo")
async def process_voice_memo(
    file: UploadFile = File(...),
    metadata: str = Form(...),
    save: bool = Form(True)
):
    # Transcribes audio, generates summary, and saves to Pinecone/DB.

    try:
        logger.info(f"Received voice memo request for: {file.filename}")
        
        # Parse metadata
        meta_dict = json.loads(metadata)
        user_id = meta_dict.get("userId")
        file_id = meta_dict.get("fileId")
        tags = meta_dict.get("tags", [])
        
        if not user_id or not file_id:
            raise HTTPException(status_code=400, detail="Missing userId or fileId")

        content = await file.read()
        
        # Save temp file
        temp_filename = f"/tmp/{uuid.uuid4()}_{file.filename}"
        with open(temp_filename, "wb") as f:
            f.write(content)
            
        # Upload to Gemini
        logger.info("Uploading to Gemini...")
        uploaded_file = genai.upload_file(temp_filename, mime_type=file.content_type)
        
        # Generate Content (Transcript + Summary)
        logger.info("Generating transcript and summary...")
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = (
            "You are a professional secretary.\n"
            "1. Transcribe the audio file verbatim (word-for-word).\n"
            "2. Create a concise summary of the content in Japanese (bullet points).\n\n"
            "Output strictly in JSON format:\n"
            "{\n"
            '    "transcript": "Full text here...",\n'
            '    "summary": "Summary in Japanese here..."\n'
            "}"
        )
        
        response = model.generate_content(
            [prompt, uploaded_file],
            generation_config={"response_mime_type": "application/json"}
        )
        
        result = json.loads(response.text)
        transcript = result.get("transcript", "")
        summary = result.get("summary", "")
        
        # Cleanup
        os.remove(temp_filename)
        
        if not transcript:
             raise HTTPException(status_code=500, detail="Failed to generate transcript")

        # Chunk Text
        chunks = chunk_text(transcript)
        logger.info(f"Generated {len(chunks)} chunks")

        # Embed and Upsert to Pinecone
        vectors = []
        
        # 1. Transcript Chunks
        for i, chunk in enumerate(chunks):
            vector_id = f"{user_id}#{file_id}#{i}"
            embedding = get_embedding(chunk)
            
            vectors.append({
                "id": vector_id,
                "values": embedding,
                "metadata": {
                    "userId": user_id,
                    "fileId": file_id,
                    "fileName": file.filename,
                    "text": chunk,
                    "chunkIndex": i,
                    "tags": tags,
                    "type": "transcript"
                }
            })
            
        # 2. Summary Vector (for Overview Search)
        if summary:
            summary_id = f"{user_id}#{file_id}#summary"
            summary_embedding = get_embedding(summary)
            vectors.append({
                "id": summary_id,
                "values": summary_embedding,
                "metadata": {
                    "userId": user_id,
                    "fileId": file_id,
                    "fileName": file.filename,
                    "text": summary, # Store summary as text
                    "chunkIndex": -1, # Special index
                    "tags": tags,
                    "type": "summary"
                }
            })

        # Batch upsert
        if save and vectors:
            # Pinecone limit is usually 100-1000 vectors per request
            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i+batch_size]
                index.upsert(vectors=batch)

        # Save to DB (if dbId is provided, otherwise Frontend will do it? 
        # Plan says: Backend returns text, Frontend updates DB. 
        # BUT we also said "Backend for High Quality Processing... Result to DB".
        # Let's return the result and let Frontend save to DB to keep consistency with /import-text flow 
        # OR save here if we have dbId.
        # Frontend will create the Document record FIRST (to get ID), then call this.
        # So we should have dbId in metadata if we follow that pattern.
        
        db_id = meta_dict.get("dbId")
        if save and db_id:
             await save_document_content(db_id, transcript, summary=summary)
        
        return {
            "status": "success", 
            "transcript": transcript,
            "summary": summary,
            "chunks_count": len(chunks)
        }

    except Exception as e:
        logger.error(f"Error processing voice memo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"message": "Python Backend is running!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

from pptx import Presentation
import csv
from docx import Document as DocxDocument
import pandas as pd

# ... (Previous imports)

# --- Helper Function for Common Processing ---
async def process_and_save_content(
    text: str, 
    metadata: dict, 
    summary: Optional[str] = None
):

    if not text.strip():
        raise HTTPException(status_code=400, detail="Extracted text is empty")

    user_id = metadata.get("userId")
    file_id = metadata.get("fileId")
    tags = metadata.get("tags", [])
    file_name = metadata.get("fileName", "Unknown")
    db_id = metadata.get("dbId")
    mime_type = metadata.get("mimeType") # Get mimeType

    # Chunk Text
    chunks = chunk_text(text)
    logger.info(f"Generated {len(chunks)} chunks for file {file_name}")

    # Embed and Upsert to Pinecone
    vectors = []
    for i, chunk in enumerate(chunks):
        vector_id = f"{user_id}#{file_id}#{i}"
        embedding = get_embedding(chunk)
        
        metadata_payload = {
            "userId": user_id,
            "fileId": file_id,
            "fileName": file_name,
            "text": chunk,
            "chunkIndex": i,
            "tags": tags
        }
        
        if db_id:
            metadata_payload["dbId"] = db_id
        
        vectors.append({
            "id": vector_id,
            "values": embedding,
            "metadata": metadata_payload
        })
        
        if len(vectors) >= 100:
            index.upsert(vectors=vectors) 
            vectors = []

    if vectors:
        index.upsert(vectors=vectors) 

    # Save full content to DB
    if db_id:
         # Pass mimeType if available (we need to update save_document_content signature or just ignore it for now?
         # Wait, save_document_content executes SQL. We need to update it too.)
         
         # Sanitize text to remove null bytes (PostgreSQL doesn't allow them)
         clean_text = text.replace("\x00", "")
         clean_summary = summary.replace("\x00", "") if summary else None
         
         await save_document_content(db_id, clean_text, summary=clean_summary, mime_type=mime_type)
    
    return {
        "status": "success", 
        "message": f"Successfully processed {file_name}",
        "chunks_count": len(chunks),
        "fileId": file_id
    }

# --- Modular Endpoints ---

# --- File Processing Helper Functions ---

async def _process_pdf(content: bytes) -> str:
    text = extract_text_from_pdf(content)
    if not text.strip() or len(text.strip()) < 50: 
        logger.info("PDF text extraction yielded little/no text. Attempting Gemini OCR...")
        ocr_text = await _process_pdf_with_gemini(content)
        if ocr_text.strip():
            text = ocr_text
    return text

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception)
)
async def _process_image(content: bytes, mime_type: str, filename: str) -> str:
    # Save temp file for Gemini upload
    temp_filename = f"/tmp/{uuid.uuid4()}_{filename}"
    with open(temp_filename, "wb") as f:
        f.write(content)
    
    try:
        logger.info("Uploading image to Gemini...")
        uploaded_file = genai.upload_file(temp_filename, mime_type=mime_type)
        
        logger.info("Generating image description...")
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = (
            "Describe this image in detail in Japanese. "
            "Include all visible text (OCR), objects, and the general context. "
            "If it's a document, transcribe the text."
        )
        response = model.generate_content([prompt, uploaded_file])
        return response.text
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

async def _process_pptx(content: bytes) -> str:
    ppt = Presentation(io.BytesIO(content))
    text = ""
    for slide in ppt.slides:
        for shape in slide.shapes:
            if hasattr(shape, "text"):
                text += shape.text + "\n"
    return text

async def _process_docx(content: bytes) -> str:
    doc = DocxDocument(io.BytesIO(content))
    text = ""
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text

async def _process_xlsx(content: bytes) -> str:
    xls = pd.read_excel(io.BytesIO(content), sheet_name=None)
    text = ""
    for sheet_name, df in xls.items():
        text += f"--- Sheet: {sheet_name} ---\n"
        text += df.to_string(index=False) + "\n\n"
    return text

async def _process_csv(content: bytes) -> str:
    return content.decode("utf-8")

# --- Unified Endpoint ---

@app.post("/import-file")
async def import_file(
    file: UploadFile = File(...),
    metadata: str = Form(...)
):
    # Unified endpoint for importing files. Dispatches to specific logic based on MIME type.
    logger.info(f"Received unified import request for file: {file.filename}")
    
    try:
        meta_dict = json.loads(metadata)
        mime_type = meta_dict.get("mimeType")
        content = await file.read()
        text = ""

        if mime_type == "application/pdf":
            text = await _process_pdf(content)
        elif mime_type.startswith("image/"):
            text = await _process_image(content, mime_type, file.filename)
        elif mime_type == "application/vnd.google-apps.presentation":
            # Google Slides (exported as PPTX)
            text = await _process_pptx(content)
        elif mime_type == "application/vnd.openxmlformats-officedocument.presentationml.presentation":
            text = await _process_pptx(content)
        elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            text = await _process_docx(content)
        elif mime_type == "application/vnd.google-apps.spreadsheet":
            # Google Sheets (exported as XLSX)
            text = await _process_xlsx(content)
        elif mime_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
            text = await _process_xlsx(content)
        elif mime_type == "text/csv":
            text = await _process_csv(content)
        elif mime_type.startswith("text/") or mime_type == "application/vnd.google-apps.document":
            text = content.decode("utf-8")
        else:
            # Fallback: try as text
            try:
                text = content.decode("utf-8")
            except:
                raise HTTPException(status_code=400, detail=f"Unsupported mime type: {mime_type}")

        return await process_and_save_content(text, meta_dict)



    except HTTPException as he:
        # Re-raise HTTP exceptions (e.g. 400 from unsupported mime type)
        raise he
    except ValueError as ve:
        # JSON parsing errors or other value errors
        logger.error(f"Value Error processing file: {ve}")
        raise HTTPException(status_code=400, detail=f"Invalid Request: {str(ve)}")
    except Exception as e:
        logger.error(f"Error processing file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# --- Modular Endpoints (Wrappers) ---

@app.post("/process-pdf")
async def process_pdf(file: UploadFile = File(...), metadata: str = Form(...)):
    meta_dict = json.loads(metadata)
    content = await file.read()
    text = await _process_pdf(content)
    return await process_and_save_content(text, meta_dict)

@app.post("/process-image")
async def process_image(file: UploadFile = File(...), metadata: str = Form(...)):
    meta_dict = json.loads(metadata)
    content = await file.read()
    text = await _process_image(content, file.content_type, file.filename)
    return await process_and_save_content(text, meta_dict)

@app.post("/process-pptx")
async def process_pptx(file: UploadFile = File(...), metadata: str = Form(...)):
    meta_dict = json.loads(metadata)
    content = await file.read()
    text = await _process_pptx(content)
    return await process_and_save_content(text, meta_dict)

@app.post("/process-docx")
async def process_docx(file: UploadFile = File(...), metadata: str = Form(...)):
    meta_dict = json.loads(metadata)
    content = await file.read()
    text = await _process_docx(content)
    return await process_and_save_content(text, meta_dict)

@app.post("/process-xlsx")
async def process_xlsx(file: UploadFile = File(...), metadata: str = Form(...)):
    meta_dict = json.loads(metadata)
    content = await file.read()
    text = await _process_xlsx(content)
    return await process_and_save_content(text, meta_dict)

@app.post("/process-csv")
async def process_csv(file: UploadFile = File(...), metadata: str = Form(...)):
    meta_dict = json.loads(metadata)
    content = await file.read()
    text = await _process_csv(content)
    return await process_and_save_content(text, meta_dict)

@app.post("/process-text")
async def process_text_file(file: UploadFile = File(...), metadata: str = Form(...)):
    meta_dict = json.loads(metadata)
    content = await file.read()
    text = content.decode("utf-8")
    return await process_and_save_content(text, meta_dict)

# Keep import-text for raw text input (not file upload)


class DeleteRequest(BaseModel):
    fileId: str
    userId: str

@app.post("/delete-file")
async def delete_file(request: DeleteRequest):
    # Deletes all vectors associated with a specific file and user.
    try:
        print(f"Received delete request for file: {request.fileId} user: {request.userId}")
        
        # Delete by metadata filter
        index.delete(filter={"fileId": request.fileId, "userId": request.userId})
        
        return {"status": "success", "message": f"Deleted vectors for file {request.fileId}"}

    except Exception as e:
        print(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class UpdateTagsRequest(BaseModel):
    fileId: str
    userId: str
    tags: List[str]

@app.post("/update-tags")
async def update_tags(request: UpdateTagsRequest):
    # Updates tags in Pinecone metadata for a specific file.
    try:
        print(f"Received update tags request for file: {request.fileId} user: {request.userId} tags: {request.tags}")
        
        # Pinecone doesn't support "update by filter". We must fetch vectors or know IDs.
        # But we constructed IDs as "{userId}#{fileId}#{chunkIndex}".
        # We can list vectors by prefix? No.
        # We can query? No, we want to update ALL chunks.
        # Best way: Fetch vectors first? Or just iterate?
        # Pinecone's `list` is paginated.
        # Actually, for a specific file, we might have 10-100 chunks.
        # We can try to fetch them if we know the count. But we don't know the count here.
        # Alternative: Delete and Re-insert? No, that requires the text.
        # Alternative: We saved "chunks_count" in DB? No.
        
        # Wait, Pinecone allows updating metadata by ID.
        # If we don't know the IDs, we are stuck.
        # BUT, we used a predictable ID format: f"{user_id}#{file_id}#{i}"
        # We can try to fetch IDs 0 to N until we find no more?
        # That seems reasonable for < 1000 chunks.
        
        # Fetch to see which exist (in batches to avoid 414 Request-URI Too Large)
        existing_ids = []
        batch_size = 100
        
        # Check up to 1000 chunks + summary
        all_potential_ids = [f"{request.userId}#{request.fileId}#{i}" for i in range(1000)]
        all_potential_ids.append(f"{request.userId}#{request.fileId}#summary")

        for i in range(0, len(all_potential_ids), batch_size):
            batch_ids = all_potential_ids[i:i+batch_size]
            try:
                fetch_response = index.fetch(ids=batch_ids)
                if fetch_response and 'vectors' in fetch_response:
                    existing_ids.extend(list(fetch_response['vectors'].keys()))
            except Exception as e:
                print(f"Error fetching batch {i}: {e}")
                # Continue to next batch even if one fails
                continue
        
        if not existing_ids:
            return {"status": "warning", "message": "No vectors found to update"}

        print(f"Found {len(existing_ids)} vectors to update.")
        
        # Update metadata for each
        # Pinecone update is per vector.
        for vector_id in existing_ids:
            index.update(
                id=vector_id,
                set_metadata={"tags": request.tags}
            )
            
        return {"status": "success", "message": f"Updated tags for {len(existing_ids)} vectors"}

    except Exception as e:
        print(f"Error updating tags: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/import-text")
async def import_text(request: TextImportRequest):
    # Imports raw text, chunks it, embeds it, and saves to Pinecone.
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

        # 2. Summary Vector (if provided)
        if request.summary:
            summary_id = f"{request.userId}#{file_id}#summary"
            summary_embedding = get_embedding(request.summary)
            vectors.append({
                "id": summary_id,
                "values": summary_embedding,
                "metadata": {
                    "userId": request.userId,
                    "fileId": file_id,
                    "fileName": "Text Entry",
                    "text": request.summary,
                    "chunkIndex": -1,
                    "tags": request.tags,
                    "type": "summary"
                }
            })

        # Batch upsert
        if vectors:
            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i+batch_size]
                index.upsert(vectors=batch)

        # Save full content to DB if dbId is provided
        if request.dbId:
             await save_document_content(request.dbId, request.text, summary=request.summary)
        
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
            top_k=20,
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
        system_instruction = """
あなたはユーザー専用の知識管理アシスタントです。以下のルールを厳守してください。

1. 提供された「参考資料（Context）」のみに基づいて回答してください。
2. 参考資料に答えがない場合は、正直に「提供された情報の中には答えが見つかりませんでした」と答えてください。無理に捏造してはいけません。
3. ユーザーの質問が、参考資料と無関係な場合（例：今日の天気は？）は、一般論として回答しても良いですが、区別がつくようにしてください。
4. 回答は簡潔かつ論理的に行ってください。
"""
        model = genai.GenerativeModel('gemini-2.0-flash', system_instruction=system_instruction)
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

