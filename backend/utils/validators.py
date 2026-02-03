from fastapi import HTTPException
from database.db import db
import logging

logger = logging.getLogger(__name__)

async def validate_course_access(course_id: str, user_id: str):
    """
    Validate that the course exists and belongs to the user.
    Raises HTTPException(403) if invalid.
    """
    if not course_id:
        return

    course = await db.course.find_first(
        where={
            "id": course_id,
            "userId": user_id
        }
    )
    
    if not course:
        logger.warning(f"Access denied: User {user_id} tried to access invalid/unowned Course {course_id}")
        raise HTTPException(status_code=403, detail="Invalid Course ID or Access Denied")
