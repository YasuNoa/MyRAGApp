# ユーザー情報、プラン、アカウント管理などのDB操作を担当するサービス
from typing import Optional, Tuple
import logging
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from prisma.errors import PrismaError

import os
import uuid
import json
import stripe
# from services.user_service import UserService # REMOVED: Circular Import caused crash
from schemas.user import SyncUserRequest, UpdatePlanRequest
from database.db import db

# Setup Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

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

    @staticmethod
    async def process_referral_reward(user_id: str):
        """
        紹介報酬処理 (Referral Reward Logic):
        ユーザー(referee)が条件達成(音声保存)した瞬間に、紹介者(referrer)と本人(referee)の標準プラン期間を延長する。
        """
        # Referral Campaign Logic
        # LAUNCH: 30 days for Referee, 30 days (1st time) for Referrer, 7 days (2nd+) for Referrer
        # STANDARD: 7 days for Everyone
        REFERRAL_CAMPAIGN_MODE = "LAUNCH" 

        try:
            # 1. Check if user was invited (has a referrer)
            referral = await db.referral.find_unique(where={'refereeId': user_id})
            
            if not referral:
                logger.debug(f"No referrer found for user {user_id}. Skipping reward.")
                # user_id is the Referee. If no record in Referral table where refereeId=user_id, then they were not invited.
                return

            if referral.status == 'COMPLETED':
                logger.debug(f"Referral already completed for {user_id}. Skipping.")
                return

            # 2. Mark as COMPLETED
            referrer_id = referral.referrerId
            
            await db.referral.update(
                where={'id': referral.id},
                data={'status': 'COMPLETED', 'completedAt': datetime.now(timezone.utc)}
            )
            logger.info(f"Referral marked as COMPLETED: {referral.id} (Referrer: {referrer_id}, Referee: {user_id})")

            # Definitions
            REFEREE_BONUS_DAYS = 7
            REFEREE_PLAN_TYPE = "STANDARD_TRIAL"
            REFERRER_BONUS_DAYS = 7
            REFERRER_PLAN_TYPE = "STANDARD_TRIAL"

            if REFERRAL_CAMPAIGN_MODE == "LAUNCH":
                REFEREE_BONUS_DAYS = 30
                REFEREE_PLAN_TYPE = "STANDARD" # Full Standard
                
                # Referrer Logic: Check history
                completed_count = await db.referral.count(
                    where={'referrerId': referrer_id, 'status': 'COMPLETED'}
                )
                # completed_count INCLUDES this one because we just updated it.
                if completed_count == 1:
                    REFERRER_BONUS_DAYS = 30
                    REFERRER_PLAN_TYPE = "STANDARD"
                else:
                    REFERRER_BONUS_DAYS = 7
                    REFERRER_PLAN_TYPE = "STANDARD_TRIAL"
            else:
                # Normal Mode
                REFEREE_BONUS_DAYS = 7
                REFEREE_PLAN_TYPE = "STANDARD_TRIAL"
                REFERRER_BONUS_DAYS = 7
                REFERRER_PLAN_TYPE = "STANDARD_TRIAL"

            # 3. Reward Referee (本人)
            await UserService._apply_reward(user_id, REFEREE_BONUS_DAYS, REFEREE_PLAN_TYPE, "Referee")

            # 4. Reward Referrer (紹介者)
            await UserService._apply_reward(referrer_id, REFERRER_BONUS_DAYS, REFERRER_PLAN_TYPE, "Referrer", completed_count if 'completed_count' in locals() else 0)

        except Exception as e:
            logger.error(f"Error processing referral reward: {e}")

    @staticmethod
    async def _apply_reward(user_id: str, bonus_days: int, plan_type: str, role: str, count: int = 0):
        """
        Helper to apply reward (Plan upgrade/extension) to a user.
        """
        try:
            sub = await db.usersubscription.find_unique(where={'userId': user_id})
            if not sub:
                return

            current_plan = sub.plan
            current_end = sub.currentPeriodEnd
            
            # Date Logic
            now = datetime.now(timezone.utc)
            if sub.currentPeriodEnd and sub.currentPeriodEnd.replace(tzinfo=timezone.utc) > now:
                 # Extend existing
                 # Ensure timezone awareness
                 current_end_aware = sub.currentPeriodEnd.replace(tzinfo=timezone.utc)
                 new_end = current_end_aware + timedelta(days=bonus_days)
            else:
                 new_end = now + timedelta(days=bonus_days)

            # Plan Logic: Upgrade FREE 
            new_plan = current_plan
            if current_plan == 'FREE':
                new_plan = plan_type
            
            await db.usersubscription.update(
                where={'userId': user_id},
                data={
                    'plan': new_plan,
                    'currentPeriodEnd': new_end
                }
            )
            logger.info(f"{role} reward applied: {user_id} -> {new_plan} until {new_end} (Bonus: {bonus_days} days)")

            # Stripe API Extension
            stripe_sub_id = sub.stripeSubscriptionId
            if stripe_sub_id:
                try:
                    stripe.Subscription.modify(
                        stripe_sub_id,
                        trial_end=int(new_end.timestamp()),
                        proration_behavior='none'
                    )
                    logger.info(f"Stripe Trial Extended for {role} {stripe_sub_id} to {new_end}")
                except Exception as se:
                    logger.error(f"Stripe API Error ({role}): {se}")

        except Exception as e:
            logger.error(f"Error applying reward to {role} {user_id}: {e}")

    @staticmethod
    async def sync_user(request: SyncUserRequest):
        """
        ユーザー情報をDBと同期します。
        ユーザーが存在しない場合は作成し、存在する場合は更新します。
        """
        logger.info(f"Sync Request received: {request}")
        
        try:
            # 1. Check if Account exists
            account = await db.account.find_first(
                where={
                    'provider': 'firebase',
                    'providerAccountId': request.userId
                },
                include={'user': True}
            )

            user_id = None

            if account and account.user:
                user_id = account.user.id
                logger.info(f"Account found for {request.userId}, linked to user {user_id}")
                
                # Update User profile if needed
                data_to_update = {}
                if request.displayName:
                    data_to_update['name'] = request.displayName
                if request.photoURL:
                    data_to_update['image'] = request.photoURL
                if request.email:
                    data_to_update['email'] = request.email
                
                if data_to_update:
                    data_to_update['updatedAt'] = datetime.now(timezone.utc)
                    await db.user.update(
                        where={'id': user_id},
                        data=data_to_update
                    )

            else:
                # 2. Check if User exists by Email
                if request.email:
                    existing_user = await db.user.find_unique(where={'email': request.email})
                    
                    if existing_user:
                        user_id = existing_user.id
                        logger.info(f"Existing user found by email {request.email}, ID: {user_id}. Linking Account.")
                        
                        # Link Account
                        await db.account.create(
                            data={
                                'id': str(uuid.uuid4()),
                                'userId': user_id,
                                'provider': 'firebase',
                                'providerAccountId': request.userId,
                                'type': 'oauth',
                                'updatedAt': datetime.now(timezone.utc)
                            }
                        )
                
                # 3. Create New User if still no user_id
                if not user_id:
                    if not request.email:
                        raise HTTPException(status_code=400, detail="Email is required for new user registration")

                    user_id = str(uuid.uuid4())
                    logger.info(f"Creating NEW user {user_id} for {request.email}")
                    
                    # Create User 
                    await db.user.create(
                        data={
                            'id': user_id,
                            'email': request.email,
                            'name': request.displayName,
                            'image': request.photoURL,
                            'emailVerified': None,
                            'updatedAt': datetime.now(timezone.utc)
                        }
                    )
                    
                    # Create Account
                    await db.account.create(
                        data={
                            'id': str(uuid.uuid4()),
                            'userId': user_id,
                            'provider': 'firebase',
                            'providerAccountId': request.userId,
                            'type': 'oauth',
                            'updatedAt': datetime.now(timezone.utc)
                        }
                    )

            # 4. Ensure UserSubscription exists
            await UserService.get_user_plan(user_id)

            return {"status": "success", "message": "User synced", "userId": user_id}

        except Exception as e:
            logger.error(f"Error syncing user: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    async def update_user_plan(request: UpdatePlanRequest):
        """
        ユーザーのプランを更新します。
        """
        valid_plans = ["FREE", "STANDARD", "PREMIUM", "STANDARD_TRIAL"]
        if request.plan not in valid_plans:
             raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of {valid_plans}")

        try:
            # Check if subscription exists
            sub = await db.usersubscription.find_unique(where={'userId': request.userId})
            
            now = datetime.now(timezone.utc)
            if sub:
                await db.usersubscription.update(
                    where={'userId': request.userId},
                    data={
                        'plan': request.plan,
                        'updatedAt': now
                    }
                )
            else:
                # Create new
                await db.usersubscription.create(
                    data={
                        'id': str(uuid.uuid4()),
                        'userId': request.userId,
                        'plan': request.plan,
                        'dailyChatCount': 0,
                        'lastChatResetAt': now,
                        'dailyVoiceCount': 0,
                        'lastVoiceDate': now,
                        'updatedAt': now
                    }
                )
                
            logger.info(f"Updated plan for user {request.userId} to {request.plan}")
            return {"status": "success", "plan": request.plan}

        except Exception as e:
            logger.error(f"Error updating user plan: {e}")
            raise HTTPException(status_code=500, detail=str(e))

