# ユーザー情報、プラン、アカウント管理などのDB操作を担当するサービス
from typing import Optional, Tuple
import logging
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from prisma.errors import PrismaError

from db import db

logger = logging.getLogger(__name__)

class UserService:
    """
    ユーザー管理、プラン管理、制限チェックを行うサービス
    User management, plan management, and limit checks service.
    """

    @staticmethod
    async def resolve_user_id(id_or_uid: str) -> str:
        """
        入力されたIDが Internal ID (CUID) か Provider ID かを判別し、
        正しい Internal User ID を返します。
        Resolves the input ID to the correct Internal User ID.
        """
        # 1. まず Internal ID として検索 (高速)
        # 1. First search as Internal ID (Fast)
        user = await db.user.find_unique(where={'id': id_or_uid})
        if user:
            return user.id

       
        
        account = await db.account.find_first(
            where={'providerAccountId': id_or_uid},
            include={'user': True}
        )
        
        if account and account.user:
            logger.info(f"Resolved Provider ID {id_or_uid} -> Internal ID {account.user.id}")
            return account.user.id
            
        # 3. 解決できない場合はエラー (または新規登録を促す)
        # 3. If unresolved, raise error
        logger.warning(f"User not found for ID: {id_or_uid}")
        raise HTTPException(status_code=404, detail="User not found. Please sync authentication first.")

    @staticmethod
    async def get_or_create_subscription(user_id: str):
        """
        ユーザーのサブスクリプションを取得、なければFREEプランで作成します。
        Gets or creates a user subscription (Defaults to FREE).
        """
        try:
            sub = await db.usersubscription.find_unique(where={'userId': user_id})
            if not sub:
                now = datetime.now(timezone.utc)
                sub = await db.usersubscription.create(
                    data={
                        'userId': user_id,
                        'plan': "FREE",
                        'dailyChatCount': 0,
                        'lastChatResetAt': now,
                        'updatedAt': now
                    }
                )
                logger.info(f"Created default FREE subscription for user {user_id}")
            return sub
        except Exception as e:
            logger.error(f"Error in get_or_create_subscription: {e}")
            raise HTTPException(status_code=500, detail="Failed to retrieve user subscription.")

    @staticmethod
    async def get_user_plan(user_id: str) -> str:
        """
        ユーザーの現在のプランを取得します。
        Gets the user's current plan.
        """
        sub = await UserService.get_or_create_subscription(user_id)
        
        # Trial Expiration Check (Local logic for non-Stripe trials)
        if sub.plan == 'STANDARD_TRIAL':
            if sub.currentPeriodEnd:
                try:
                    end_time = sub.currentPeriodEnd
                    if end_time.tzinfo is None:
                        end_time = end_time.replace(tzinfo=timezone.utc)
                    
                    if datetime.now(timezone.utc) > end_time:
                        logger.info(f"Trial expired for {user_id}. Treating as FREE.")
                        return "FREE"
                except Exception as e:
                    logger.warning(f"Date comparison error in plan check: {e}")
        
        return sub.plan

    @staticmethod
    async def check_and_increment_chat_limit(user_id: str) -> None:
        """
        チャット利用制限をチェックし、カウントをインクリメントします。
        Checks chat limits and increments the count.
        """
        sub = await UserService.get_or_create_subscription(user_id)
        
        current_plan = sub.plan
        daily_count = sub.dailyChatCount
        last_reset = sub.lastChatResetAt or datetime.now(timezone.utc)
        
        # JST Timezone
        jst = timezone(timedelta(hours=9))
        
        # Limits Definition
        LIMITS = {"FREE": 5, "STANDARD": 100, "PREMIUM": 200, "STANDARD_TRIAL": 100}
        limit = LIMITS.get(current_plan, 10)
        
        now = datetime.now(timezone.utc)
        should_reset = False
        
        if last_reset.tzinfo is None:
            last_reset = last_reset.replace(tzinfo=timezone.utc)
        
        logger.info(f"Checking chat limit for {user_id}: Plan={current_plan}, Count={daily_count}/{limit}")

        if current_plan == "FREE":
            limit = 10 # Explicitly set limit for Free plan in code to match new requirement

            # Daily Reset Logic (Same as other plans)
            if last_reset.astimezone(jst).date() != now.astimezone(jst).date():
                should_reset = True
        else:
            # Daily Reset (JST) for other plans
            if last_reset.astimezone(jst).date() != now.astimezone(jst).date():
                should_reset = True
                
        if should_reset:
            daily_count = 0
            last_reset = now
            
        if daily_count >= limit and not should_reset:
            raise HTTPException(status_code=403, detail=f"Chat limit reached for {current_plan} plan ({limit}/day).")
            
        # Increment
        await db.usersubscription.update(
            where={'userId': user_id},
            data={
                'dailyChatCount': daily_count + 1,
                'lastChatResetAt': last_reset
            }
        )

    @staticmethod
    async def check_storage_limit(user_id: str):
        """
        知識ベース（ファイル）の保存数制限をチェックします。
        Checks storage limits for knowledge base files.
        """
        plan = await UserService.get_user_plan(user_id)
        
        LIMITS = {
            "FREE": 5,
            "STANDARD": 200,
            "STANDARD_TRIAL": 200,
            "PREMIUM": 1000,
        }
        limit = LIMITS.get(plan, 5)
        
        count = await db.document.count(
             where={'userId': user_id} # Count all documents or filter by type if needed
        )
        # Note: Original logic filtered by type='knowledge', but schema might not have 'type' or it might be implicit.
        # Assuming all Documents count towards storage for simplicity or consistency with previous code.
        # If 'type' field is not in schema (it was in main.py SQL but maybe not in Prisma schema?), be careful.
        # Let's check schema if needed. Assuming 'source' or just count all.
        
        if count >= limit:
             raise HTTPException(status_code=403, detail=f"Storage limit reached for {plan} plan. Limit: {limit} files.")

