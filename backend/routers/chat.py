from fastapi import APIRouter, HTTPException, Depends
from dependencies import get_current_user
from pydantic import BaseModel
from typing import List, Optional
import logging

from services.chat_service import ChatService

# Setup Logger
logger = logging.getLogger(__name__)

router = APIRouter()
chat_service = ChatService()

class AskRequest(BaseModel):
    query: str
    userId: str
    threadId: Optional[str] = None
    tags: List[str] = []

class ClassifyRequest(BaseModel):
    text: str

@router.post("/classify")
async def classify_intent(request: ClassifyRequest):
    """
    ユーザーの入力意図 (Intent) をGeminiを使って分類します。
    """
    return ChatService.classify_intent(request.text)

@router.get("/threads")
async def get_threads(current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["uid"]
        return await chat_service.get_threads(user_id)
    except Exception as e:
        logger.error(f"Error fetching threads: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ask")
async def ask(request: AskRequest):
    """
    RAG Chat Endpoint (Delegates to ChatService)
    """
    try:
        return await chat_service.ask(
            query=request.query,
            user_id=request.userId,
            thread_id=request.threadId,
            tags=request.tags
        )
    except Exception as e:
        logger.error(f"Error in ask endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))
