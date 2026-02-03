from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import io
import json
import uuid
import time
import sys
import logging
from dotenv import load_dotenv

load_dotenv()

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    logger.error("DATABASE_URL is not set!")

from routers.api import router as api_router

app = FastAPI()

app.include_router(api_router)

# CORS Configuration
# ALLOWED_ORIGINS環境変数から許可するオリジンを取得 (カンマ区切り)
# 設定がない場合は空リスト（アクセス拒否）とする安全なデフォルト動作
allowed_origins_str = os.environ.get("ALLOWED_ORIGINS", "")
origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

if not origins:
    logger.warning("ALLOWED_ORIGINS is empty! CORS requests might be blocked.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    # セキュリティ強化のため、許可するHTTPメソッドを明示的に指定
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    # セキュリティ強化のため、許可するヘッダーを明示的に指定
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
)
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


from database.db import connect_db, disconnect_db

@app.on_event("startup")
async def startup_event():
 
    try:
        logger.info("Connecting to Prisma...")
        await connect_db()
        logger.info("Prisma connected.")
    except Exception as e:
        logger.error(f"Error connecting to Prisma: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down...")
    await disconnect_db()




@app.get("/")
def read_root():
    return {"message": "Python Backend is running!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
