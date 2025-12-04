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
# from sentence_transformers import CrossEncoder # 軽量化のため削除 (REMOVED for lightweight)
# import pytesseract # 軽量化のため削除 (REMOVED for lightweight)
# from pdf2image import convert_from_bytes # 軽量化のため削除 (REMOVED for lightweight)
from datetime import datetime
import asyncpg
import logging
import sys
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import re
from prompts import (
    CHAT_SYSTEM_PROMPT,
    VOICE_MEMO_PROMPT,
    IMAGE_DESCRIPTION_PROMPT,
    PDF_TRANSCRIPTION_PROMPT,
    INTENT_CLASSIFICATION_PROMPT
)

def clean_json_response(text: str) -> str:
    """Markdownのコードブロックを除去してJSON文字列を抽出する"""
    # ```json ... ``` or ``` ... ``` を除去
    text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)
    return text.strip()

load_dotenv()

# --- 設定 (Configuration) ---
# ログ設定: アプリケーションの動作状況をコンソールに出力します。
# デバッグやエラー追跡のために重要です。
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

# --- クライアント初期化 (Initialize Clients) ---
# Pinecone (ベクトルDB) と Gemini (AIモデル) のクライアントを初期化します。
# これらはアプリケーション全体で再利用されるため、グローバルスコープで定義します。
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX_NAME)
genai.configure(api_key=GOOGLE_API_KEY)

# Cross-Encoder (再ランク付け用モデル) の初期化
# 検索精度の向上のために使用しますが、軽量化のため現在はコメントアウトしています。
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
    tags: List[str] = [] # categoryからtagsリストに変更 (柔軟な分類のため)
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
        # データベース接続プールを作成します。
        # statement_cache_size=0 は、Supabase等の Transaction Pooler (ポート6543) との互換性のため必須です。
        # これを設定しないと、Prepared Statement エラーが発生する可能性があります。
        db_pool = await asyncpg.create_pool(DATABASE_URL, statement_cache_size=0)
        logger.info("Database connected.")
    except Exception as e:
        logger.error(f"Error connecting to database: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    if db_pool:
        await db_pool.close()

# --- ヘルパー関数 (Helper Functions) ---

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception)
)
def get_embedding(text: str) -> List[float]:
    # 与えられたテキストのベクトル埋め込み (Embedding) をGeminiを使って生成します。
    # ベクトル化することで、テキストの意味に基づいた検索 (Semantic Search) が可能になります。
    try:
        # テキストを少しクリーニングして、改行コードによる不具合を防ぎます
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
    # PDFファイルのバイナリデータからテキストを抽出します。
    # pypdfライブラリを使用して、ページごとにテキストを読み取ります。
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
    # PDFをGemini 2.0 Flashにアップロードして、テキスト抽出 (OCR) を行います。
    # 通常のテキスト抽出が失敗した場合や、画像中心のPDFの場合に使用します。
    temp_filename = f"/tmp/{uuid.uuid4()}.pdf"
    try:
        with open(temp_filename, "wb") as f:
            f.write(content)
        
        logger.info("Uploading PDF to Gemini for OCR...")
        uploaded_file = genai.upload_file(temp_filename, mime_type="application/pdf")
        
        logger.info("Generating PDF transcript...")
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = PDF_TRANSCRIPTION_PROMPT
        response = model.generate_content([prompt, uploaded_file])
        return response.text
    except Exception as e:
        logger.error(f"Error processing PDF with Gemini: {e}")
        return ""
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 150) -> List[str]:
    # 長いテキストを適切なサイズ (チャンク) に分割します。
    # LangChainのRecursiveCharacterTextSplitterを使用し、文脈が途切れないように重複 (overlap) を持たせます。
    if not text:
        return []
    
    # 日本語と英語に対応した最適なセパレータ設定
    # 句読点や改行で区切ることで、意味のまとまりを維持します
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
    # ドキュメントの全文テキスト、要約、MIMEタイプをPostgreSQLに保存します。
    # これにより、RAGで検索した際に、元の文脈全体を参照できるようになります (Long Context RAG)。
    if not db_pool:
        logger.warning("DB Pool not initialized, skipping content save.")
        return

    try:
        async with db_pool.acquire() as conn:
            # IDで更新を試み、失敗したらexternalIdで試みます
            # 注意: Documentモデルのスキーマを確認し、存在するカラムのみを更新します。
            # categoryカラムは存在しないため、mimeTypeなどを更新対象としています。
            
            query = """
                UPDATE "Document"
                SET content = $1, summary = $2, "mimeType" = $3
                WHERE id = $4
            """
            result = await conn.execute(query, content, summary, mime_type, doc_id)
            
            if result == "UPDATE 0":
                 # IDで見つからない場合、externalId (Google Drive IDなど) で更新を試みます
                 query_ext = """
                    UPDATE "Document"
                    SET content = $1, summary = $2, "mimeType" = $3
                    WHERE "externalId" = $4
                """
                 await conn.execute(query_ext, content, summary, mime_type, doc_id)
                 
            if result == "UPDATE 0":
                 # 重複して実行されていますが、念のため (前のブロックと同じロジックです)
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
    # PostgreSQLからドキュメントの全文テキストを取得します。
    # RAGで回答を生成する際、検索でヒットした断片だけでなく、この全文をAIに渡すことで精度を高めます。
    if not db_pool:
        return ""
    
    try:
        async with db_pool.acquire() as conn:
            # IDで検索し、なければexternalIdで検索します
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
    # 音声メモを処理します。Geminiを使って文字起こしと要約を行い、PineconeとDBに保存します。
    # 1. 音声をGeminiにアップロード
    # 2. 文字起こしと要約を生成
    # 3. テキストをチャンク分割してベクトル化 (Pineconeへ保存)
    # 4. 全文と要約をDBへ保存

    try:
        logger.info(f"Received voice memo request for: {file.filename}")
        
        # メタデータの解析
        meta_dict = json.loads(metadata)
        user_id = meta_dict.get("userId")
        file_id = meta_dict.get("fileId")
        tags = meta_dict.get("tags", [])
        
        if not user_id or not file_id:
            raise HTTPException(status_code=400, detail="Missing userId or fileId")

        content = await file.read()
        
        # 0. Check Limits
        user_plan = await get_user_plan(user_id)
        
        # Storage Limit (All files)
        await check_storage_limit(user_id, user_plan)
        
        # Voice Limit (Audio files)
        if file.content_type.startswith("audio/"): # Use file.content_type for mime_type
            await check_and_increment_voice_limit(user_id, user_plan)

        # 1. Save temporary
        temp_filename = f"/tmp/{uuid.uuid4()}_{file.filename}"
        with open(temp_filename, "wb") as f:
            f.write(content)
            
        # Geminiへのアップロード
        logger.info("Uploading to Gemini...")
        uploaded_file = genai.upload_file(temp_filename, mime_type=file.content_type)
        
        # コンテンツ生成 (文字起こし + 要約)
        logger.info("Generating transcript and summary...")
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = VOICE_MEMO_PROMPT
        
        try:
            response = model.generate_content(
                [prompt, uploaded_file],
                generation_config={"response_mime_type": "application/json"},
            )
            logger.info(f"Gemini Raw Response: {response.text}")
            
            try:
                # 1. Try parsing directly
                result = json.loads(response.text)
            except json.JSONDecodeError:
                # 2. Try cleaning markdown
                cleaned = clean_json_response(response.text)
                try:
                    result = json.loads(cleaned)
                except json.JSONDecodeError:
                    # 3. Fallback: Treat as raw text if parsing fails completely
                    logger.warning("JSON parsing failed. Falling back to raw text.")
                    result = {"transcript": response.text, "summary": "（要約生成失敗）"}

        except Exception as e:
            logger.error(f"Gemini Generation Error: {e}")
            if hasattr(e, 'response'):
                 logger.error(f"Gemini Error Response: {e.response}")
            # Instead of 500, return a partial success if possible, or re-raise
            raise HTTPException(status_code=500, detail=f"Gemini Error: {str(e)}")

        transcript = result.get("transcript", "")
        summary = result.get("summary", "")
        
        # クリーンアップ (一時ファイルの削除)
        os.remove(temp_filename)
        
        if not transcript:
             raise HTTPException(status_code=500, detail="Failed to generate transcript")

        # テキストのチャンク分割
        chunks = chunk_text(transcript)
        logger.info(f"Generated {len(chunks)} chunks")

        # ベクトル化とPineconeへの保存
        vectors = []
        
        # 1. 文字起こしテキストのチャンク
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
            
        # 2. 要約ベクトル (全体検索用)
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
                    "text": summary, # 要約をテキストとして保存
                    "chunkIndex": -1, # 特別なインデックス
                    "tags": tags,
                    "type": "summary"
                }
            })

        # バッチ更新 (Upsert)
        if save and vectors:
            # Pineconeの制限 (通常1リクエストあたり100-1000ベクトル) を考慮
            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i+batch_size]
                index.upsert(vectors=batch)

        # DBへの保存 (dbIdが提供されている場合)
        # フロントエンド側でDocumentレコードを作成し、そのID (dbId) を渡してくる想定です。
        # ここで処理結果 (テキスト、要約) をDBに保存します。
        
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

# --- 共通処理用ヘルパー関数 (Helper Function for Common Processing) ---
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

    # テキストのチャンク分割
    chunks = chunk_text(text)
    logger.info(f"Generated {len(chunks)} chunks for file {file_name}")

    # ベクトル化とPineconeへの保存
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

    # 全文コンテンツをDBに保存
    if db_id:
         # mimeTypeがあれば渡します
         
         # PostgreSQLはNULLバイトを許容しないため、サニタイズします
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

# --- ファイル処理用ヘルパー関数 (File Processing Helper Functions) ---

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
    # 画像をGeminiにアップロードして、その内容説明 (Description) を生成させます。
    # これにより、画像の内容もテキストとして検索可能になります。
    temp_filename = f"/tmp/{uuid.uuid4()}_{filename}"
    with open(temp_filename, "wb") as f:
        f.write(content)
    
    try:
        logger.info("Uploading image to Gemini...")
        uploaded_file = genai.upload_file(temp_filename, mime_type=mime_type)
        
        logger.info("Generating image description...")
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = IMAGE_DESCRIPTION_PROMPT
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

import subprocess

# ... (Existing imports)

def get_audio_duration(file_path: str) -> float:
    # ffmpegを使用して音声ファイルの再生時間（秒）を取得します。
    # プランごとの制限時間をチェックするために必要です。
    try:
        # ffmpeg -i input 2>&1 | grep "Duration"
        # Or use ffprobe if available. Dockerfile installed ffmpeg, which usually includes ffprobe.
        # Let's try parsing ffmpeg output as it's more robust if ffprobe is missing.
        command = ["ffmpeg", "-i", file_path]
        result = subprocess.run(command, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        # Output is in stderr
        # Duration: 00:00:00.00
        import re
        match = re.search(r"Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})", result.stderr)
        if match:
            hours, minutes, seconds = map(float, match.groups())
            return hours * 3600 + minutes * 60 + seconds
        return 0.0
    except Exception as e:
        logger.error(f"Error getting audio duration: {e}")
        return 0.0

# --- Usage Limit Helpers ---

async def check_storage_limit(user_id: str, plan: str):
    LIMITS = {
        "FREE": 5,
        "STANDARD": 100,
        "PREMIUM": 1000,
    }
    limit = LIMITS.get(plan, 5)
    
    async with db_pool.acquire() as conn:
        # Count knowledge documents
        count = await conn.fetchval(
            'SELECT COUNT(*) FROM "Document" WHERE "userId" = $1 AND "type" = \'knowledge\'',
            user_id
        )
        
        if count >= limit:
             raise HTTPException(status_code=403, detail=f"Storage limit reached for {plan} plan. Limit: {limit} files.")

async def check_and_increment_voice_limit(user_id: str, plan: str):
    # 1. Daily Count Limit (Free Only)
    if plan == "FREE":
        LIMIT = 5
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow('SELECT "dailyVoiceCount", "lastVoiceDate" FROM "UserSubscription" WHERE "userId" = $1', user_id)
            
            daily_count = 0
            last_date = datetime.now()
            
            if row:
                daily_count = row["dailyVoiceCount"]
                last_date = row["lastVoiceDate"]
            
            # Check reset (JST)
            now = datetime.now(timezone(timedelta(hours=9)))
            last_date_jst = last_date.astimezone(timezone(timedelta(hours=9)))
            
            if last_date_jst.date() != now.date():
                daily_count = 0
            
            if daily_count >= LIMIT:
                 raise HTTPException(status_code=403, detail=f"Daily voice upload limit reached for FREE plan. Limit: {LIMIT}/day.")
            
            # Increment
            # Note: We increment here. If processing fails later, it still counts.
            # This is safer for preventing abuse.
            if row:
                await conn.execute(
                    'UPDATE "UserSubscription" SET "dailyVoiceCount" = $1, "lastVoiceDate" = $2 WHERE "userId" = $3',
                    daily_count + 1, now, user_id
                )
            else:
                # Should exist, but handle just in case
                pass

async def check_and_update_audio_time_limit(user_id: str, plan: str, duration_sec: float):
    # Standard/Premium Time Limit
    if plan == "FREE":
        return # Free plan handled by count limit

    duration_min = int(duration_sec / 60)
    
    # File Limit
    FILE_LIMITS = {
        "STANDARD": 120,
        "PREMIUM": 180,
    }
    file_limit = FILE_LIMITS.get(plan, 120)
    if duration_min > file_limit:
        raise HTTPException(status_code=400, detail=f"Audio file duration ({duration_min}m) exceeds limit for {plan} plan ({file_limit}m).")

    # Monthly Limit
    MONTHLY_LIMITS = {
        "STANDARD": 1800,
        "PREMIUM": 6000,
    }
    monthly_limit = MONTHLY_LIMITS.get(plan, 1800)

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow('SELECT "monthlyVoiceMinutes", "lastVoiceResetDate", "purchasedVoiceBalance" FROM "UserSubscription" WHERE "userId" = $1', user_id)
        
        current_usage = 0
        purchased = 0
        last_reset = datetime.now()
        
        if row:
            current_usage = row["monthlyVoiceMinutes"]
            purchased = row["purchasedVoiceBalance"]
            last_reset = row["lastVoiceResetDate"]

        # Monthly Reset Check
        now = datetime.now()
        if last_reset.month != now.month or last_reset.year != now.year:
            current_usage = 0
            last_reset = now
        
        total_available = monthly_limit + purchased
        if current_usage + duration_min > total_available:
             raise HTTPException(status_code=403, detail=f"Monthly audio limit exceeded. Usage: {current_usage}m + {duration_min}m > {total_available}m")

        # Update
        new_usage = current_usage + duration_min
        if row:
            await conn.execute(
                'UPDATE "UserSubscription" SET "monthlyVoiceMinutes" = $1, "lastVoiceResetDate" = $2 WHERE "userId" = $3',
                new_usage, last_reset, user_id
            )

async def check_and_increment_chat_limit(user_id: str, plan: str):
    LIMITS = {
        "FREE": 10,
        "STANDARD": 100,
        "PREMIUM": 200,
    }
    limit = LIMITS.get(plan, 10)
    
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow('SELECT "dailyChatCount", "lastChatResetAt" FROM "UserSubscription" WHERE "userId" = $1', user_id)
        
        daily_count = 0
        last_reset = datetime.now()
        
        if row:
            daily_count = row["dailyChatCount"]
            last_reset = row["lastChatResetAt"]
            
        now = datetime.now()
        should_reset = False
        
        if plan == "FREE":
            # Free Plan Logic: 10/2h + 1h Cooldown
            if daily_count >= limit:
                # Check Cooldown (1h from last message)
                last_msg = await conn.fetchrow('SELECT "createdAt" FROM "Message" WHERE "userId" = $1 AND "role" = \'user\' ORDER BY "createdAt" DESC LIMIT 1', user_id)
                last_chat_time = last_msg["createdAt"] if last_msg else datetime.min
                # Ensure timezone aware comparison if needed, but DB usually returns naive UTC or aware.
                # Assuming naive UTC from Prisma/Postgres default.
                # Let's make 'now' naive UTC for comparison if last_chat_time is naive.
                # Or better, use aware UTC.
                # Postgres timestamp is usually without timezone but stored as UTC.
                
                # Simple check:
                one_hour_ago = now - timedelta(hours=1)
                
                # Handle timezone offset if necessary. Assuming system runs in UTC or consistent.
                # If last_chat_time is offset-naive and now is offset-naive, it works.
                
                if last_chat_time < one_hour_ago:
                    should_reset = True
                else:
                    reset_time = last_chat_time + timedelta(hours=1)
                    diff_min = int((reset_time - now).total_seconds() / 60)
                    raise HTTPException(status_code=403, detail=f"Free plan limit reached. Available in {diff_min} minutes.")
            else:
                # Check Window (2h)
                two_hours_ago = now - timedelta(hours=2)
                if last_reset < two_hours_ago:
                    should_reset = True
        else:
            # Standard/Premium: Daily Reset
            # Check if date changed (JST)
            now_jst = now.astimezone(timezone(timedelta(hours=9)))
            last_reset_jst = last_reset.astimezone(timezone(timedelta(hours=9)))
            if last_reset_jst.date() != now_jst.date():
                should_reset = True
                
        if should_reset:
            daily_count = 0
            last_reset = now
            
        if daily_count >= limit:
             raise HTTPException(status_code=403, detail=f"Chat limit exceeded for {plan} plan. Limit: {limit}")
             
        # Increment
        new_count = 1 if should_reset else daily_count + 1
        new_reset = now if should_reset else last_reset
        
        if row:
            await conn.execute(
                'UPDATE "UserSubscription" SET "dailyChatCount" = $1, "lastChatResetAt" = $2 WHERE "userId" = $3',
                new_count, new_reset, user_id
            )
        else:
             # Create if missing
             await conn.execute(
                'INSERT INTO "UserSubscription" ("userId", "plan", "dailyChatCount", "lastChatResetAt") VALUES ($1, $2, $3, $4)',
                user_id, plan, 1, now
            )

async def _process_audio(content: bytes, mime_type: str, filename: str, user_plan: str = "FREE", user_id: str = "") -> str:
    # 音声をGemini 2.0 Flashにアップロードして文字起こしを行います。
    # ユーザープランに応じて、トリミング (Free) や時間制限チェック (Standard/Premium) を行います。
    temp_filename = f"/tmp/{uuid.uuid4()}_{filename}"
    trimmed_filename = None
    
    try:
        with open(temp_filename, "wb") as f:
            f.write(content)
        
        upload_filename = temp_filename
        
        # 音声の長さ(秒)を取得
        duration_sec = get_audio_duration(temp_filename)
        logger.info(f"Audio duration: {duration_sec}s")

        # プラン制限のチェック
        if user_plan == "FREE":
            if duration_sec > 1200:
                logger.info("Free plan detected. Trimming audio to 20 minutes (1200s)...")
                trimmed_filename = trim_audio(temp_filename, duration_sec=1200)
                if trimmed_filename != temp_filename:
                    upload_filename = trimmed_filename
                    mime_type = "audio/mpeg"
        else:
            # Standard/Premium: 制限チェックとDB更新
            if user_id:
                # 4. Check & Update Audio Time Limit (Standard/Premium)
                # Note: Free plan is handled by count limit (checked at start) and trimming (done in transcribe)
                await check_and_update_audio_time_limit(user_id, user_plan, duration_sec)
        
        logger.info(f"Uploading audio to Gemini... (File: {upload_filename})")
        uploaded_file = genai.upload_file(upload_filename, mime_type=mime_type)
        
        logger.info("Generating audio transcript...")
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = VOICE_MEMO_PROMPT
        
        # 構造化データ (JSON) でのレスポンスを要求 (文字起こし + 要約)
        response = model.generate_content(
            [prompt, uploaded_file],
            generation_config={"response_mime_type": "application/json"}
        )
        
        try:
            result = json.loads(response.text)
            transcript = result.get("transcript", "")
            return transcript
        except json.JSONDecodeError:
            # Try cleaning markdown
            cleaned = clean_json_response(response.text)
            try:
                result = json.loads(cleaned)
                return result.get("transcript", "")
            except json.JSONDecodeError:
                # Fallback to raw text
                return response.text

    except HTTPException as e:
        logger.error(f"Audio limit error: {e.detail}")
        raise e # 400/403エラーをそのまま返す
    except Exception as e:
        logger.error(f"Error processing audio with Gemini: {e}")
        return ""
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        if trimmed_filename and os.path.exists(trimmed_filename) and trimmed_filename != temp_filename:
            os.remove(trimmed_filename)

# --- Unified Endpoint ---

@app.post("/import-file")
async def import_file(
    file: UploadFile = File(...),
    metadata: str = Form(...)
):
    # ファイルインポートの統合エンドポイントです。
    # MIMEタイプに基づいて、適切な処理ロジック (PDF, 画像, 音声など) に振り分けます。
    logger.info(f"Received unified import request for file: {file.filename}")
    
    try:
        meta_dict = json.loads(metadata)
        mime_type = meta_dict.get("mimeType")
        user_plan = meta_dict.get("userPlan", "FREE") # Default to FREE if not specified
        user_id = meta_dict.get("userId", "")
        
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
        elif mime_type.startswith("audio/"):
            text = await _process_audio(content, mime_type, file.filename, user_plan, user_id)
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
    # 指定されたファイルに関連する全てのベクトルをPineconeから削除します。
    # ユーザーがファイルを削除した際、検索結果に出ないようにするために必要です。
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
    # 指定されたファイルのPineconeメタデータ（タグ）を更新します。
    # これにより、ユーザーが後からタグを変更しても、新しいタグでフィルタリングできるようになります。
    try:
        print(f"Received update tags request for file: {request.fileId} user: {request.userId} tags: {request.tags}")
        
        # Pineconeは「フィルタによる更新」をサポートしていません。ベクトルIDを指定する必要があります。
        # ベクトルIDは "{userId}#{fileId}#{chunkIndex}" という形式で生成しています。
        # チャンク数が不明なため、0から順にIDを生成して存在確認を行います。
        # (通常は1000チャンク未満と想定)
        
        # 存在確認を行うIDリストの生成 (バッチ処理で414エラーを回避)
        existing_ids = []
        batch_size = 100
        
        # 最大1000チャンク + 要約ベクトルまでチェック
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
                # 一部のバッチが失敗しても処理を継続
                continue
        
        if not existing_ids:
            return {"status": "warning", "message": "No vectors found to update"}

        print(f"Found {len(existing_ids)} vectors to update.")
        
        # 各ベクトルのメタデータを更新
        # Pineconeのupdateはベクトルごとに行う必要があります
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
    # テキストデータを直接インポートします (ファイルアップロードではない場合)。
    # テキストをチャンク分割し、ベクトル化してPineconeに保存します。
    try:
        print(f"Received text import request from user: {request.userId}")
        
        if not request.text.strip():
             raise HTTPException(status_code=400, detail="Text is empty")

        # テキストのチャンク分割
        chunks = chunk_text(request.text)
        
        # このテキストエントリ用の一意なfileIdを生成
        file_id = str(uuid.uuid4())

        # ベクトル化とPineconeへの保存
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
                    "fileName": "Text Entry", # プレースホルダー
                    "text": chunk,
                    "chunkIndex": i,
                    "tags": request.tags # メタデータにタグを追加
                }
            })

        # 2. 要約ベクトル (提供されている場合)
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

        # バッチ更新 (Upsert)
        if vectors:
            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i+batch_size]
                index.upsert(vectors=batch)

        # dbIdが提供されている場合、全文をDBに保存
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
    ユーザーの入力意図 (Intent) をGeminiを使って分類します。
    例: "チャットしたい", "検索したい", "保存したい" などを判別し、適切な処理に振り分けるために使用します。
    """
    try:
        prompt = INTENT_CLASSIFICATION_PROMPT.format(text=request.text)
        
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
        return {"intent": "CHAT", "tags": ["General"]}

class QueryRequest(BaseModel):
    query: str
    userId: str
    tags: List[str] = [] # categoryからtagsリストに変更

@app.post("/query")
async def query_knowledge(request: QueryRequest):
    """
    ユーザーのクエリを受け取り、Pineconeから関連情報を検索し、Geminiを使って回答を生成します (RAG)。
    1. クエリをベクトル化
    2. Pineconeで類似ベクトルを検索 (タグフィルタ適用)
    3. 必要に応じてPostgreSQLから全文を取得 (Long Context)
    4. 検索結果をコンテキストとしてGeminiに渡し、回答を生成
    """
    try:
        print(f"Received query: {request.query} from user: {request.userId}, tags: {request.tags}")
        
        # 1. Check Chat Limit
        user_plan = await get_user_plan(request.userId)
        await check_and_increment_chat_limit(request.userId, user_plan)

        # 0. Check Storage Limit
        user_plan = await get_user_plan(request.userId)
        await check_storage_limit(request.userId, user_plan)

        # 1. Generate Embedding for Query
        query_embedding = get_embedding(request.query)
        
        # 2. Pinecone検索
        index = pc.Index(PINECONE_INDEX_NAME)
        
        # タグが指定されている場合、フィルタを作成
        filter_dict = {"userId": request.userId}
        if request.tags:
            # Pineconeの "$in" 演算子を使用して、指定されたタグのいずれかを持つドキュメントを検索します。
            # 例: tags=["Math", "Science"] の場合、"Math" または "Science" タグを持つドキュメントがヒットします。
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
            # 検索結果がない場合でも、Geminiに判断を委ねるために処理を続行します。
            # "関連する学習データは見つかりませんでした。" というコンテキストを渡すことで、
            # システムプロンプトに従ってGoogle検索を行ったり、キャラクターとして応答したりできるようにします。
            print("No matches found in Pinecone. Proceeding with empty context fallback.")
            context = "関連する学習データは見つかりませんでした。"
        else:
            # 3. PostgreSQLから全文コンテンツを取得 (Long Context RAG)
            context_parts = []
            seen_doc_ids = set()
            
            for match in search_results['matches']:
                # メタデータからdbId (またはfileId) を取得します。
                # 新しいインポートではdbIdが保存されていますが、古いデータ(Drive連携など)ではfileIdのみの場合があります。
                
                metadata = match['metadata']
                doc_id = metadata.get('dbId') or metadata.get('fileId')
                
                # DBから全文取得を試みます
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
                
                # 全文が見つからない場合、Pineconeのチャンクテキストをフォールバックとして使用します
                if not full_content:
                    chunk_text = metadata.get('text', '')
                    print(f"Using chunk text fallback (Length: {len(chunk_text)})")
                    context_parts.append(f"Source: {metadata.get('fileName', 'Unknown')} (Excerpt)\n\n{chunk_text}")

            context = "\n\n---\n\n".join(context_parts)
        print(f"Final Context Length: {len(context)}")
        
        # 4. Geminiで回答生成
        system_instruction = CHAT_SYSTEM_PROMPT
        # Google検索 (Grounding) を有効化
        model = genai.GenerativeModel('gemini-2.0-flash', system_instruction=system_instruction, tools='google_search_retrieval')
        prompt = f"""
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

