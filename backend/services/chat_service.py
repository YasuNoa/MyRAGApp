# チャット機能（RAGを含む対話ロジック、履歴管理）を担当するサービス
import os
import logging
from typing import List, Dict, Any, Optional
import google.generativeai as genai
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential

# Setup Logger
logger = logging.getLogger(__name__)

# Initialize Clients
# PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX", "myragapp")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

class RagService:
    _index = None

    # Pinecone Index initialization removed

    @staticmethod
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def get_embedding(text: str) -> List[float]:
        try:
            clean_text = text.replace("\n", " ")
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=clean_text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise e

    # upsert_vectors removed (Use VectorService)
