from pydantic import BaseModel
from typing import Optional

class FeedbackCreate(BaseModel):
    content: str
