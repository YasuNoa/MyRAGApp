
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
import json
import logging
from services.knowledge_service import KnowledgeService
from schemas.knowledge import TextImportRequest, DeleteRequest, UpdateKnowledgeRequest

logger = logging.getLogger(__name__)

router = APIRouter()

from dependencies import get_current_user
from fastapi import Depends

@router.post("/import-file")
async def import_file(
    file: UploadFile = File(...),
    metadata: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    # ファイルインポートの統合エンドポイント
    logger.info(f"Received unified import request for file: {file.filename}")
    
    try:
        meta_dict = json.loads(metadata)
        # Override user_id from token
        meta_dict["userId"] = current_user["uid"]
        meta_dict["fileName"] = file.filename
        
        mime_type = meta_dict.get("mimeType")
        content = await file.read()
        text = ""

        if mime_type == "application/pdf":
            text = await KnowledgeService.process_pdf(content)
        elif mime_type and mime_type.startswith("image/"):
            text = await KnowledgeService.process_image(content, mime_type, file.filename)
        elif mime_type == "application/vnd.google-apps.presentation":
            text = await KnowledgeService.process_pptx(content)
        elif mime_type == "application/vnd.openxmlformats-officedocument.presentationml.presentation":
            text = await KnowledgeService.process_pptx(content)
        elif mime_type == "application/vnd.google-apps.document":
            text = await KnowledgeService.process_docx(content)
        elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            text = await KnowledgeService.process_docx(content)
        elif mime_type == "application/vnd.google-apps.spreadsheet":
            text = await KnowledgeService.process_xlsx(content)
        elif mime_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
            text = await KnowledgeService.process_xlsx(content)
        elif mime_type == "text/csv":
            text = await KnowledgeService.process_csv(content)
        elif mime_type and mime_type.startswith("text/"):
             text = content.decode("utf-8")
        else:
             # Fallback
             text = content.decode("utf-8", errors="ignore")

        return await KnowledgeService.process_and_save_content(text, meta_dict)

    except Exception as e:
        logger.error(f"Error importing file: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")



@router.post("/import-text")
async def import_text(
    request: TextImportRequest,
    current_user: dict = Depends(get_current_user)
):
    # テキストデータを直接インポート
    try:
        user_id = current_user["uid"]
        meta_dict = {
            "userId": user_id,
            "fileId": request.db_id, # Use dbId
            "dbId": request.db_id,
            "courseId": request.course_id, # Added
            "fileName": "Text Entry",
            "tags": request.tags,
            "source": request.source
        }
        return await KnowledgeService.process_and_save_content(request.text, meta_dict, summary=request.summary)

    except Exception as e:
        logger.error(f"Error processing text: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")



@router.post("/delete-file")
async def delete_file(
    request: DeleteRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user["uid"]
        # Soft delete
        await KnowledgeService.delete_document(doc_id=request.id, user_id=user_id)
        return {"status": "success", "message": f"Moved file {request.id} to trash"}
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/restore-file")
async def restore_file(
    request: DeleteRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user["uid"]
        await KnowledgeService.restore_document(doc_id=request.id, user_id=user_id)
        return {"status": "success", "message": f"Restored file {request.id}"}
    except Exception as e:
        logger.error(f"Error restoring file: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/delete-file/permanent")
async def permanent_delete_file(
    request: DeleteRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user["uid"]
        await KnowledgeService.permanent_delete_document(doc_id=request.id, user_id=user_id)
        return {"status": "success", "message": f"Permanently deleted file {request.id}"}
    except Exception as e:
        logger.error(f"Error permanently deleting file: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/trash")
async def get_trash(current_user: dict = Depends(get_current_user)):
    try:
        userId = current_user["uid"]
        docs = await KnowledgeService.get_trash_documents(user_id=userId)
        # Format dates? or return active rows
        return docs
    except Exception as e:
        logger.error(f"Error fetching trash: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")



@router.post("/update-knowledge") # Renamed from /update-tags for clarity
async def update_knowledge(
    request: UpdateKnowledgeRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user["uid"]
        # Service handles DB and Vector update
        await KnowledgeService.update_knowledge(
            doc_id=request.id, 
            user_id=user_id, 
            tags=request.tags,
            title=request.title
        )
        return {"status": "success", "message": f"Updated knowledge for file {request.id}"}
    except Exception as e:
        logger.error(f"Error updating tags: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/categories")
async def get_categories(current_user: dict = Depends(get_current_user)):
    try:
        userId = current_user["uid"]
        tags = await KnowledgeService.get_categories(user_id=userId)
        return {"tags": tags}
    except Exception as e:
        logger.error(f"Error fetching categories: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


