# Request/Response models for Knowledge

from pydantic import BaseModel
from typing import List, Optional

class TextImportRequest(BaseModel):
    text: str
    userId: str
    source: str = "manual"
    dbId: Optional[str] = None
    courseId: Optional[str] = None # Added for course support
    tags: List[str] = [] # categoryからtagsリストに変更 (柔軟な分類のため)
    summary: Optional[str] = None
