from pydantic import BaseModel
from typing import Optional

class SyncUserRequest(BaseModel):
    userId: str
    email: Optional[str] = None
    displayName: Optional[str] = None
    photoURL: Optional[str] = None

class UpdatePlanRequest(BaseModel):
    userId: str
    plan: str # FREE, STANDARD, PREMIUM
