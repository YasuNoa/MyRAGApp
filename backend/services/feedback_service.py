from database.db import db
import logging

logger = logging.getLogger(__name__)

class FeedbackService:
    @staticmethod
    async def create_feedback(user_id: str, content: str) -> None:
        """
        フィードバックを作成する
        """
        prisma = db
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
