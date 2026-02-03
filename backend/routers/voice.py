from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List, Dict, Any
import json
import logging

from services.voice_service import VoiceService
from dependencies import get_current_user
from schemas.voice import SaveVoiceRequest, VoiceSaveResponse, VoiceProcessResponse

# Setup Logger
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/save", response_model=VoiceSaveResponse)
async def save_voice(req: SaveVoiceRequest, user: Dict[str, Any] = Depends(get_current_user)):
    logger.info(f"Received save voice request for user: {req.user_id} (Auth: {user['uid']})")
    
    # ID Consistency Check
    if req.user_id != user["uid"]:
        logger.warning(f"User ID mismatched. Request: {req.user_id}, Auth: {user['uid']}")
        raise HTTPException(status_code=403, detail="User ID mismatch")

    try:
        result = await VoiceService.save_voice_memo(
            user_id=user["uid"], # Use verified ID
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
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/process", response_model=VoiceProcessResponse)
async def process_voice_memo_endpoint(
    file: UploadFile = File(...),
    metadata: str = Form(...),
    save: bool = Form(True),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Process voice memo (Split -> Transcribe -> Summarize -> Save).
    Same interface as legacy main.py endpoint.
    """
    logger.info(f"Received voice memo request for: {file.filename} (User: {user['uid']})")
    
    try:
        meta_dict = json.loads(metadata)
        
        # Override or Validate User ID from metadata
        if "userId" in meta_dict and meta_dict["userId"] != user["uid"]:
             logger.warning(f"Metadata User ID {meta_dict.get('userId')} mismatch with Auth ID {user['uid']}")
             raise HTTPException(status_code=403, detail="User ID mismatch")
        
        # Enforce Auth ID
        meta_dict["userId"] = user["uid"]

        # Call Service (Service takes UploadFile directly now)
        result = await VoiceService.process_voice_memo(file, meta_dict, save)
        return result

    except HTTPException as e:
         raise e
    except Exception as e:
         logger.error(f"Voice Error: {e}")
         raise HTTPException(status_code=500, detail="Internal Server Error")
