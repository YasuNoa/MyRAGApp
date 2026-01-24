from fastapi import APIRouter, HTTPException
from services.user_service import UserService
from schemas.user import SyncUserRequest, UpdatePlanRequest

router = APIRouter()

@router.post("/auth/sync")
async def sync_user(request: SyncUserRequest):
    """
    ユーザー情報をDBと同期します。
    ユーザーが存在しない場合は作成し、存在する場合は更新します。
    """
    return await UserService.sync_user(request)

@router.post("/user/plan")
async def update_user_plan(request: UpdatePlanRequest):
    """
    ユーザーのプランを更新します (iOS等のクライアントからの同期用)。
    """
    return await UserService.update_user_plan(request)
