from typing import List, Optional
from pydantic import BaseModel
from .common import CamelModel

# --- Requests ---

class AskRequest(CamelModel):
    query: str
    user_id: str
    thread_id: Optional[str] = None
    tags: List[str] = []

class ClassifyRequest(CamelModel):
    text: str

# --- Responses ---

class AskResponse(CamelModel):
    answer: str
    sources: Optional[List[str]] = []
    thread_id: Optional[str] = None

class ClassifyResponse(CamelModel):
    intent: str
    confidence: Optional[float] = None
    tags: List[str] = []
