# Request/Response models for Knowledge

from typing import List, Optional
from .common import CamelModel

class TextImportRequest(CamelModel):
    text: str
    user_id: Optional[str] = None
    source: str = "manual"
    db_id: Optional[str] = None
    course_id: Optional[str] = None
    tags: List[str] = []
    summary: Optional[str] = None

class DeleteRequest(CamelModel):
    id: str 
    user_id: Optional[str] = None

class UpdateKnowledgeRequest(CamelModel):
    id: str
    user_id: Optional[str] = None
    tags: Optional[List[str]] = None
    title: Optional[str] = None
