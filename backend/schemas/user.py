from pydantic import BaseModel
from typing import Optional

class SyncUserRequest(BaseModel):
    providerId: str
    email: Optional[str] = None
    displayName: Optional[str] = None
    photoURL: Optional[str] = None

class UpdatePlanRequest(BaseModel):
    providerId: str
    plan: str # FREE, STANDARD, PREMIUM
