
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List
import json
import logging
import uuid
import shutil
import os

from services.voice_service import VoiceService

# Setup Logger
logger = logging.getLogger(__name__)

router = APIRouter()

class SaveVoiceRequest(BaseModel):
    userId: str
    transcript: str
    summary: str
    title: str
    tags: List[str] = []

@router.post("/save")
async def save_voice(req: SaveVoiceRequest):
    logger.info(f"Received save voice request for user: {req.userId}")
    try:
        result = await VoiceService.save_voice_memo(
            user_id=req.userId,
            transcript=req.transcript,
            summary=req.summary,
            title=req.title,
            tags=req.tags
        )
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Save Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process")
async def process_voice_memo_endpoint(
    file: UploadFile = File(...),
    metadata: str = Form(...),
    save: bool = Form(True)
):
    """
    Process voice memo (Split -> Transcribe -> Summarize -> Save).
    Same interface as legacy main.py endpoint.
    """
    logger.info(f"Received voice memo request for: {file.filename}")
    
    try:
        meta_dict = json.loads(metadata)
        # Call Service (Service takes UploadFile directly now)
        return await VoiceService.process_voice_memo(file, meta_dict, save)

    except HTTPException as e:
         raise e
    except Exception as e:
         logger.error(f"Voice Error: {e}")
         raise HTTPException(status_code=500, detail=str(e))
