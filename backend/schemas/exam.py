from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict, Union
from datetime import datetime

# --- Question Types ---
class QuestionType(str):
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE"
    FILL_IN = "FILL_IN"
    ESSAY = "ESSAY"

# --- Question Models ---
class QuestionBase(BaseModel):
    type: str # QuestionType
    text: str
    order: int
    data: Dict[str, Any] # Flexible JSON data

class QuestionCreate(QuestionBase):
    pass

class QuestionResponse(QuestionBase):
    id: str
    examId: str

    class Config:
        from_attributes = True

# --- Exam Models ---
class ExamCreate(BaseModel):
    courseId: str
    title: str
    questions: List[QuestionCreate]

class ExamResponse(BaseModel):
    id: str
    courseId: str
    title: str
    createdAt: datetime
    questions: List[QuestionResponse] = []

    class Config:
        from_attributes = True
