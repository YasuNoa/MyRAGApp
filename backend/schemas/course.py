from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class CourseCreate(BaseModel):
    title: str = Field(..., example="数学 I・A")
    color: str = Field(default="blue", example="blue") # blue, red, green, yellow, purple, gray
    icon: Optional[str] = Field(None, example="📐")

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class CourseResponse(BaseModel):
    id: str
    userId: str
    title: str
    color: str
    icon: Optional[str]
    createdAt: datetime
    updatedAt: datetime
    
    # Optional: Include counts or nested objects if needed
    documentCount: int = 0
    examCount: int = 0


    class Config:
        from_attributes = True

# --- Nested Models for Detail View ---

class CourseDocumentResponse(BaseModel):
    id: str
    userId: str # Required by iOS KnowledgeDocument
    title: str
    source: str
    type: str # 'knowledge' or others
    mimeType: Optional[str]
    createdAt: datetime
    
    class Config:
        from_attributes = True

class CourseQuestionResponse(BaseModel):
    id: str
    type: str
    text: str
    order: int
    data: Dict[str, Any]

    class Config:
        from_attributes = True

class CourseExamResponse(BaseModel):
    id: str
    courseId: str # Required by iOS Exam
    title: str
    createdAt: datetime
    questions: List[CourseQuestionResponse] = []

    class Config:
        from_attributes = True

class CourseDetailResponse(CourseResponse):
    documents: List[CourseDocumentResponse] = []
    exams: List[CourseExamResponse] = []

