
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

@router.post("/import-file")
async def import_file(
    file: UploadFile = File(...),
    metadata: str = Form(...)
):
    # ファイルインポートの統合エンドポイント
    logger.info(f"Received unified import request for file: {file.filename}")
    
    try:
        meta_dict = json.loads(metadata)
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
async def process_text_file(file: UploadFile = File(...), metadata: str = Form(...)):
    meta_dict = json.loads(metadata)
    content = await file.read()
    text = content.decode("utf-8")
    return await KnowledgeService.process_and_save_content(text, meta_dict)

@router.post("/import-text")
async def import_text(request: TextImportRequest):
    # テキストデータを直接インポート
    try:
        meta_dict = {
            "userId": request.userId,
            "fileId": request.dbId, # Use dbId
            "dbId": request.dbId,
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
    userId: str

@router.post("/delete-file")
async def delete_file(request: DeleteRequest):
    try:
        # Service handles both DB and Vector deletion
        await KnowledgeService.delete_document(doc_id=request.fileId, user_id=request.userId)
        return {"status": "success", "message": f"Deleted file {request.fileId}"}
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class UpdateTagsRequest(BaseModel):
    fileId: str
    userId: str
    tags: List[str]

@router.post("/update-tags")
async def update_tags(request: UpdateTagsRequest):
    try:
        # Service handles both DB and Vector update
        await KnowledgeService.update_tags(doc_id=request.fileId, user_id=request.userId, tags=request.tags)
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
async def process_image_endpoint(file: UploadFile = File(...), metadata: str = Form(...)):
    meta_dict = json.loads(metadata)
    content = await file.read()
    text = await KnowledgeService.process_image(content, file.content_type, file.filename)
    return await KnowledgeService.process_and_save_content(text, meta_dict)

@router.post("/process-pptx")
async def process_pptx_endpoint(file: UploadFile = File(...), metadata: str = Form(...)):
    meta_dict = json.loads(metadata)
    content = await file.read()
    text = await KnowledgeService.process_pptx(content)
    return await KnowledgeService.process_and_save_content(text, meta_dict)

@router.post("/process-docx")
async def process_docx_endpoint(file: UploadFile = File(...), metadata: str = Form(...)):
    meta_dict = json.loads(metadata)
    content = await file.read()
    text = await KnowledgeService.process_docx(content)
    return await KnowledgeService.process_and_save_content(text, meta_dict)

@router.post("/process-xlsx")
async def process_xlsx_endpoint(file: UploadFile = File(...), metadata: str = Form(...)):
    meta_dict = json.loads(metadata)
    content = await file.read()
    text = await KnowledgeService.process_xlsx(content)
    return await KnowledgeService.process_and_save_content(text, meta_dict)

@router.post("/process-csv")
async def process_csv_endpoint(file: UploadFile = File(...), metadata: str = Form(...)):
    meta_dict = json.loads(metadata)
    content = await file.read()
    text = await KnowledgeService.process_csv(content)
    return await KnowledgeService.process_and_save_content(text, meta_dict)
