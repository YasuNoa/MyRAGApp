from database.db import get_prisma
import logging

logger = logging.getLogger(__name__)

class FeedbackService:
    @staticmethod
    async def create_feedback(user_id: str, content: str) -> None:
        """
        フィードバックを作成する
        """
        prisma = await get_prisma()
        try:
            await prisma.feedback.create(
                data={
                    "userId": user_id,
                    "content": content
                }
            )
        except Exception as e:
            logger.error(f"Error creating feedback in service: {e}")
            raise e
