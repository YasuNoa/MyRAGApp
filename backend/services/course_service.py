from database.db import db
from schemas.course import CourseCreate, CourseUpdate
from typing import List, Optional
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

# Timezone Definition
JST = timezone(timedelta(hours=9))

class CourseService:
    async def create_course(self, user_id: str, data: CourseCreate):
        prisma = db
        return await prisma.course.create(
            data={
                "userId": user_id,
                "title": data.title,
                "color": data.color,
                "icon": data.icon
            }
        )

    async def get_courses(self, user_id: str):
        prisma = db
        # Include counts of documents and exams
        courses = await prisma.course.find_many(
            where={"userId": user_id},
            order={"createdAt": "desc"},
            include={
                "documents": {"where": {"deletedAt": None}}, 
                "exams": True
            }
        )
        
        # Map to response with counts (if schema requires it, otherwise just return raw)
        # For now, let's just return the prisma objects, Pydantic will handle basic fields.
        # If we need counts, we might need a custom transformation here.
        result = []
        for c in courses:
            c_dict = c.model_dump()
            c_dict['documentCount'] = len(c.documents)
            c_dict['examCount'] = len(c.exams)
            result.append(c_dict)
            
        return result

    async def get_course_by_id(self, user_id: str, course_id: str):
        prisma = db
        return await prisma.course.find_first(
            where={"id": course_id, "userId": user_id},
            include={"documents": {"where": {"deletedAt": None}}, "exams": True}
        )

    async def update_course(self, user_id: str, course_id: str, data: CourseUpdate):
        prisma = db
        # Ensure ownership
        exists = await prisma.course.find_first(where={"id": course_id, "userId": user_id})
        if not exists:
            return None

        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        return await prisma.course.update(
            where={"id": course_id},
            data=update_data
        )

    async def delete_course(self, user_id: str, course_id: str):
        prisma = db
        # Ensure ownership
        exists = await prisma.course.find_first(where={"id": course_id, "userId": user_id})
        if not exists:
            return None
            
        # Soft delete documents: set deletedAt=NOW, courseId=None
        # from datetime import datetime # Removed local import
        now = datetime.now(JST)
        
        # Update documents belonging to this course
        await prisma.document.update_many(
            where={"courseId": course_id},
            data={"deletedAt": now, "courseId": None}
        )
        
        return await prisma.course.delete(where={"id": course_id})
