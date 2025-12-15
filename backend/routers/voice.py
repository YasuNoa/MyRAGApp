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
async def process_voice(
    file: UploadFile = File(...),
    metadata: str = Form(...)
):
    logger.info(f"Received voice process request: {file.filename}")
    
    try:
        # Parse Metadata
        try:
            meta_dict = json.loads(metadata)
        except:
             raise HTTPException(status_code=400, detail="Invalid metadata JSON")
            
        user_id = meta_dict.get("userId")
        if not user_id:
             raise HTTPException(status_code=400, detail="userId is required")
             
        # Save Temp File (Input for Service)
        temp_filename = f"/tmp/{uuid.uuid4()}_{file.filename}"
        with open(temp_filename, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        mime_type = file.content_type or "audio/mpeg"

        try:
            # Call Service
            result = await VoiceService.process_audio(
                file_path=temp_filename, 
                user_id=user_id, 
                mime_type=mime_type
            )
            return result

        finally:
            # Cleanup Input File
            if os.path.exists(temp_filename):
                os.remove(temp_filename)

    except HTTPException as e:
         raise e
    except Exception as e:
         logger.error(f"Voice Error: {e}")
         raise HTTPException(status_code=500, detail=str(e))
