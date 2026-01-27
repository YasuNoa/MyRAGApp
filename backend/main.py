from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import io
import json
import uuid
import subprocess # For running ffmpeg
from typing import List, Optional, Tuple
from pypdf import PdfReader
import google.generativeai as genai
from dotenv import load_dotenv

# from sentence_transformers import CrossEncoder # 軽量化のため削除 (REMOVED for lightweight)
# import pytesseract # 軽量化のため削除 (REMOVED for lightweight)
# from pdf2image import convert_from_bytes # 軽量化のため削除 (REMOVED for lightweight)
from datetime import datetime, timedelta, timezone
import asyncpg
import logging
import sys
import time
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import re
from prompts import (
    CHAT_SYSTEM_PROMPT,
    VOICE_MEMO_PROMPT,
    IMAGE_DESCRIPTION_PROMPT,
    PDF_TRANSCRIPTION_PROMPT,
    PDF_TRANSCRIPTION_PROMPT,
    AUDIO_CHUNK_PROMPT,
    SUMMARY_FROM_TEXT_PROMPT,
    INTENT_CLASSIFICATION_PROMPT
)
from search_service import SearchService
from services.vector_service import VectorService

# Initialize Search Service
search_service = SearchService()

from schemas.common import clean_json_response

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
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/myragapp") 

if not GOOGLE_API_KEY:
    logger.warning("API Keys not found in environment variables")

def get_audio_duration(file_path: str) -> float:
    """Get the duration of an audio file in seconds using ffprobe."""
    try:
        cmd = [
            "ffprobe", 
            "-v", "error", 
            "-show_entries", "format=duration", 
            "-of", "default=noprint_wrappers=1:nokey=1", 
            file_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return float(result.stdout.strip())
    except Exception as e:
        logger.error(f"Failed to get audio duration: {e}")
        return 0.0



genai.configure(api_key=GOOGLE_API_KEY)


from routers.api import router as api_router

app = FastAPI()

# --- Router Registration ---
# すべてのルーター定義は routers/api.py に集約されています。
app.include_router(api_router)

# --- Universal Links Support ---




# TextImportRequest moved to schemas.knowledge

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

# Reference: Request Logging Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        logger.info(f"Incoming Request: {request.method} {request.url}")
        
        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000
            logger.info(f"Request Completed: {request.method} {request.url} - Status: {response.status_code} - Duration: {process_time:.2f}ms")
            return response
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            logger.error(f"Request Failed: {request.method} {request.url} - Duration: {process_time:.2f}ms - Error: {e}")
            raise e

app.add_middleware(RequestLoggingMiddleware)

# --- Startup ---
# --- Startup ---
from database.db import connect_db, disconnect_db
import database.db as db_module

# ...

@app.on_event("startup")
async def startup_event():
    # ... (existing logging code) ...
    
    # Initialize Prisma
    try:
        logger.info("Connecting to Prisma...")
        await connect_db()
        logger.info("Prisma connected.")
    except Exception as e:
        logger.error(f"Error connecting to Prisma: {e}")

    try:
        logger.info("Connecting to Database (asyncpg)...") # Keep asyncpg for now until full migration
        db_module.db_pool = await asyncpg.create_pool(DATABASE_URL, statement_cache_size=0)
        logger.info("Database (asyncpg) connected.")
    except Exception as e:
        logger.error(f"Error connecting to database (asyncpg): {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down...")
    await disconnect_db()
    if db_module.db_pool:
        await db_module.db_pool.close()

# --- ヘルパー関数 (Helper Functions) ---





# --- Endpoints ---


@app.get("/")
def read_root():
    return {"message": "Python Backend is running!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
