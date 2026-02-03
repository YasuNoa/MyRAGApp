from fastapi import APIRouter, HTTPException, Depends
from services.user_service import UserService
from schemas.user import SyncUserRequest, UpdatePlanRequest
from dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/auth/sync")
async def sync_user(
    request: SyncUserRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    ユーザー情報をDBと同期します。
    ユーザーが存在しない場合は作成し、存在する場合は更新します。
    """
    try:
        # Enforce providerId from token
        request.providerId = current_user["uid"]
        return await UserService.sync_user(request)
    except Exception as e:
        logger.error(f"Error syncing user: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/user/plan")
async def update_user_plan(
    request: UpdatePlanRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    ユーザーのプランを更新します (iOS等のクライアントからの同期用)。
    """
    try:
        # Enforce providerId from token
        request.providerId = current_user["uid"]
        return await UserService.update_user_plan(request)
    except Exception as e:
        logger.error(f"Error updating user plan: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
