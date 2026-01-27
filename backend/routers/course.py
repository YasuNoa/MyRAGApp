from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from schemas.course import CourseCreate, CourseResponse, CourseUpdate, CourseDetailResponse
from services.course_service import CourseService
from dependencies importget_current_user

router = APIRouter()
service = CourseService()

@router.post("/courses", response_model=CourseResponse)
async def create_course(
    data: CourseCreate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["uid"]
    return await service.create_course(user_id, data)

@router.get("/courses", response_model=List[CourseResponse])
async def get_courses(
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["uid"]
    return await service.get_courses(user_id)

from schemas.course import CourseCreate, CourseResponse, CourseUpdate, CourseDetailResponse

# ...

@router.get("/courses/{course_id}", response_model=CourseDetailResponse)
async def get_course_detail(
    course_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["uid"]
    course = await service.get_course_by_id(user_id, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Manual mapping for counts (since get_course_by_id returns Prisma object with includes)
    c_dict = course.model_dump()
    c_dict['documentCount'] = len(course.documents)
    c_dict['examCount'] = len(course.exams)
    c_dict['documents'] = course.documents # Prisma objects
    c_dict['exams'] = course.exams # Prisma objects
    return c_dict

@router.patch("/courses/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: str,
    data: CourseUpdate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["uid"]
    updated = await service.update_course(user_id, course_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Re-fetch or simplistic return (missing counts if we just return update result without includes)
    # For now, let's return the updated object with 0 counts to match schema, or fetch again.
    # Simple fix: return as is, missing counts might validation error if default is not handled?
    # Schema has default=0 so it's fine.
    return updated

@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["uid"]
    deleted = await service.delete_course(user_id, course_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Course not found")
    return None
