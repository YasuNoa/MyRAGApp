import os
import logging
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from pinecone import Pinecone
from tenacity import retry, stop_after_attempt, wait_exponential

# Setup Logger
logger = logging.getLogger(__name__)

# Initialize Clients
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX", "myragapp")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

class RagService:
    _pc = None
    _index = None

    @classmethod
    def get_index(cls):
        if cls._index is None:
            if not PINECONE_API_KEY:
                logger.error("PINECONE_API_KEY not set")
                return None
            cls._pc = Pinecone(api_key=PINECONE_API_KEY)
            cls._index = cls._pc.Index(PINECONE_INDEX_NAME)
        return cls._index

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

    @classmethod
    def upsert_vectors(cls, vectors: List[Dict[str, Any]]):
        """
        Upsert vectors to Pinecone.
        vectors: List of dicts with 'id', 'values', 'metadata'
        """
        try:
            idx = cls.get_index()
            if not idx:
                raise Exception("Pinecone index not initialized")
            
            idx.upsert(vectors=vectors)
            logger.info(f"Successfully upserted {len(vectors)} vectors to Pinecone.")
        except Exception as e:
            logger.error(f"Error upserting to Pinecone: {e}")
            raise e
