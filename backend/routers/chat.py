from fastapi import APIRouter, HTTPException, Depends
from dependencies import get_current_user
from typing import List, Optional
import logging

from services.chat_service import ChatService
from schemas.chat import AskRequest, AskResponse, ClassifyRequest, ClassifyResponse

# Setup Logger
logger = logging.getLogger(__name__)

router = APIRouter()
chat_service = ChatService()

@router.post("/classify", response_model=ClassifyResponse)
async def classify_intent(
    request: ClassifyRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    ユーザーの入力意図 (Intent) をGeminiを使って分類します。
    """
    result = await ChatService.classify_intent(request.text)
    # Service returns dict, validate against Response Model
    return result

@router.get("/threads")
async def get_threads(current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["uid"]
        return await chat_service.get_threads(user_id)
    except Exception as e:
        logger.error(f"Error fetching threads: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/ask", response_model=AskResponse)
async def ask(
    request: AskRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    RAG Chat Endpoint (Delegates to ChatService)
    """
    try:
        # Use authenticated user ID instead of request.userId for security
        user_id = current_user["uid"]
        
        result = await chat_service.ask(
            query=request.query,
            user_id=user_id,
            thread_id=request.thread_id,
            tags=request.tags
        )
        return result
        
    except Exception as e:
        logger.error(f"Error in ask endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
