from fastapi import APIRouter, HTTPException, Depends
from schemas.feedback import FeedbackCreate
from database.db import get_prisma
from dependencies import get_current_user
from services.feedback_service import FeedbackService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("")
async def create_feedback(request: FeedbackCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["uid"]
    
    try:
        if not request.content.strip():
             raise HTTPException(status_code=400, detail="Content is required")

        await FeedbackService.create_feedback(user_id, request.content)
        return {"success": True, "message": "Feedback submitted successfully"}
    except Exception as e:
        logger.error(f"Error creating feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))
