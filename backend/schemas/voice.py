from typing import List, Optional
from .common import CamelModel

# --- Requests ---

class SaveVoiceRequest(CamelModel):
    user_id: str
    transcript: str
    summary: str
    title: str
    tags: List[str] = []

# --- Responses ---

class VoiceProcessResponse(CamelModel):
    status: str
    transcript: str
    summary: str
    chunks_count: int

class VoiceSaveResponse(CamelModel):
    id: str
    status: str
