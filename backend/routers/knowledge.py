
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
import json
import logging

from services.knowledge_service import KnowledgeService
from services.vector_service import VectorService
from schemas.knowledge import TextImportRequest

logger = logging.getLogger(__name__)

router = APIRouter()

from dependencies import get_current_user
from fastapi import Depends

@router.post("/import-file")
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
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-text")
async def process_text_file(
    file: UploadFile = File(...), 
    metadata: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    meta_dict = json.loads(metadata)
    meta_dict["userId"] = current_user["uid"] # Security override
    content = await file.read()
    text = content.decode("utf-8")
    return await KnowledgeService.process_and_save_content(text, meta_dict)

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
            "fileId": request.dbId, # Use dbId
            "dbId": request.dbId,
            "courseId": request.courseId, # Added
            "fileName": "Text Entry",
            "tags": request.tags,
            "source": request.source
        }
        return await KnowledgeService.process_and_save_content(request.text, meta_dict, summary=request.summary)

    except Exception as e:
        logger.error(f"Error processing text: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class DeleteRequest(BaseModel):
    fileId: str
    userId: Optional[str] = None # Optional for legacy compatibility

@router.post("/delete-file")
async def delete_file(
    request: DeleteRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user["uid"]
        # Soft delete
        await KnowledgeService.delete_document(doc_id=request.fileId, user_id=user_id)
        return {"status": "success", "message": f"Moved file {request.fileId} to trash"}
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/restore-file")
async def restore_file(
    request: DeleteRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user["uid"]
        await KnowledgeService.restore_document(doc_id=request.fileId, user_id=user_id)
        return {"status": "success", "message": f"Restored file {request.fileId}"}
    except Exception as e:
        logger.error(f"Error restoring file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/delete-file/permanent")
async def permanent_delete_file(
    request: DeleteRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user["uid"]
        await KnowledgeService.permanent_delete_document(doc_id=request.fileId, user_id=user_id)
        return {"status": "success", "message": f"Permanently deleted file {request.fileId}"}
    except Exception as e:
        logger.error(f"Error permanently deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trash")
async def get_trash(current_user: dict = Depends(get_current_user)):
    try:
        userId = current_user["uid"]
        docs = await KnowledgeService.get_trash_documents(user_id=userId)
        # Format dates? or return active rows
        return docs
    except Exception as e:
        logger.error(f"Error fetching trash: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class UpdateTagsRequest(BaseModel):
    fileId: str
    userId: Optional[str] = None
    tags: List[str]

@router.post("/update-tags")
async def update_tags(
    request: UpdateTagsRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user["uid"]
        # Service handles both DB and Vector update
        await KnowledgeService.update_tags(doc_id=request.fileId, user_id=user_id, tags=request.tags)
        return {"status": "success", "message": f"Updated tags for file {request.fileId}"}
    except Exception as e:
        logger.error(f"Error updating tags: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Legacy endpoints mapping (optional, or just handle via import-file unified)
# For compatibility with existing frontend, we might validly just route everything to /import-file or keep specific endpoints if frontend calls them.
# The `main.py` had `/process-image`, `/process-pptx` etc.
# Ideally frontend should use `/import-file` unified, but if not, we can add aliases.
# I will add aliases for safety.

@router.post("/process-image")
async def process_image_endpoint(
    file: UploadFile = File(...), 
    metadata: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    meta_dict = json.loads(metadata)
    meta_dict["userId"] = current_user["uid"]
    content = await file.read()
    text = await KnowledgeService.process_image(content, file.content_type, file.filename)
    return await KnowledgeService.process_and_save_content(text, meta_dict)

@router.post("/process-pptx")
async def process_pptx_endpoint(
    file: UploadFile = File(...), 
    metadata: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    meta_dict = json.loads(metadata)
    meta_dict["userId"] = current_user["uid"]
    content = await file.read()
    text = await KnowledgeService.process_pptx(content)
    return await KnowledgeService.process_and_save_content(text, meta_dict)

@router.get("/categories")
async def get_categories(current_user: dict = Depends(get_current_user)):
    try:
        userId = current_user["uid"]
        tags = await KnowledgeService.get_categories(user_id=userId)
        return {"tags": tags}
    except Exception as e:
        logger.error(f"Error fetching categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-docx")
async def process_docx_endpoint(
    file: UploadFile = File(...), 
    metadata: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    meta_dict = json.loads(metadata)
    meta_dict["userId"] = current_user["uid"]
    content = await file.read()
    text = await KnowledgeService.process_docx(content)
    return await KnowledgeService.process_and_save_content(text, meta_dict)

@router.post("/process-xlsx")
async def process_xlsx_endpoint(
    file: UploadFile = File(...), 
    metadata: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    meta_dict = json.loads(metadata)
    meta_dict["userId"] = current_user["uid"]
    content = await file.read()
    text = await KnowledgeService.process_xlsx(content)
    return await KnowledgeService.process_and_save_content(text, meta_dict)

@router.post("/process-csv")
async def process_csv_endpoint(
    file: UploadFile = File(...), 
    metadata: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    meta_dict = json.loads(metadata)
    meta_dict["userId"] = current_user["uid"]
    content = await file.read()
    text = await KnowledgeService.process_csv(content)
    return await KnowledgeService.process_and_save_content(text, meta_dict)
