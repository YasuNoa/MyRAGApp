# データのベクトル化、保存・検索を担当するサービス
import logging
import os
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from langchain_text_splitters import RecursiveCharacterTextSplitter
from db import db

logger = logging.getLogger(__name__)

# Initialize Gemini for Embeddings
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)


class VectorService:
    """
    データのベクトル化と保存・検索を担当するサービス
    """

    @staticmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception)
    )
    def get_embedding(text: str) -> List[float]:
        # 与えられたテキストのベクトル埋め込み (Embedding) をGeminiを使って生成します。
        # ベクトル化することで、テキストの意味に基づいた検索 (Semantic Search) が可能になります。
        try:
            # テキストを少しクリーニングして、改行コードによる不具合を防ぎます
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

    @staticmethod
    async def upsert_vectors(vectors: List[Dict[str, Any]]):
        """
        Upsert vectors and metadata to Supabase (Postgres) via DocumentChunk table.
        vectors: List of dicts with 'values' (embedding), 'metadata' (dict)
        """
        if not vectors:
            return

        try:
           
            values_list = []
            params = []
            
          
            count = 0
            for vec in vectors:
                embedding = vec['values'] # List[float]
                meta = vec['metadata']
                
                # Extract metadata fields
                user_id = meta.get('userId')
                file_id = meta.get('fileId')
                file_name = meta.get('fileName')
                text = meta.get('text', '')
                chunk_index = meta.get('chunkIndex', 0)
                tags = meta.get('tags', [])
                doc_type = meta.get('type', 'transcript')
                
                # dbId in metadata -> documentId
                document_id = meta.get('dbId') 
                
                # Format vector for Postgres pgvector: '[1,2,3]'
                vector_str = f"[{','.join(map(str, embedding))}]"
                
                # Insert
                query = """
                    INSERT INTO "DocumentChunk" 
                    ("id", "userId", "fileId", "fileName", "content", "chunkIndex", "tags", "type", "documentId", "embedding", "createdAt")
                    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9::vector, NOW())
                """
                
                # tags (List[str]) -> Postgres Array
                # Prisma execute_raw params handling: List[str] usually maps to ARRAY.
                
                await db.execute_raw(
                    query,
                    user_id,
                    file_id,
                    file_name,
                    text,
                    chunk_index,
                    tags,
                    doc_type,
                    document_id,
                    vector_str 
                )
                count += 1
                
            logger.info(f"Successfully inserted {count} chunks to Supabase Vector.")

        except Exception as e:
            logger.error(f"Error upserting vectors to Supabase: {e}")
            raise e

    @staticmethod
    async def search_vectors(
        query_embedding: List[float], 
        top_k: int = 20, 
        filter: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Search vectors in DocumentChunk using cosine distance.
        Returns format similar to Pinecone for compatibility:
        { 'matches': [ {'id': ..., 'score': ..., 'metadata': ...} ] }
        """
        try:
            vector_str = f"[{','.join(map(str, query_embedding))}]"
            
            # Construct Filter Clause
            # Pinecone filter example: {"userId": "...", "tags": {"$in": [...]}}
            
            where_clauses = []
            params = [vector_str, top_k] # $1=vector, $2=limit
            param_idx = 3
            
            if filter:
                if 'userId' in filter:
                    where_clauses.append(f'"userId" = ${param_idx}')
                    params.append(filter['userId'])
                    param_idx += 1
                    
                if 'tags' in filter:
                    # Handle MongoDB-style "$in" if present
                    tag_filter = filter['tags']
                    if isinstance(tag_filter, dict) and '$in' in tag_filter:
                        # Postgres: "tags" && ARRAY[...] (overlap)
                        # or exact match? Pinecone $in means "if any of these tags are present in the document tags"?
                        # Pinecone: "The tag field contains any of these values" -> one of logic?
                        # Actually Pinecone 'tags': {'$in': ['a']} checks if the scalar field value is in the list.
                        # But here 'tags' is an array column.
                        # If query tags is ['a', 'b'], we usually want docs that have 'a' OR 'b'.
                        # Postgres: "tags" && $3
                        tags_list = tag_filter['$in']
                        where_clauses.append(f'"tags" && ${param_idx}')
                        params.append(tags_list)
                        param_idx += 1
                    elif isinstance(tag_filter, list):
                        # Simple list usually implies exact match or containment? 
                        # Let's assume overlap for array column.
                        where_clauses.append(f'"tags" && ${param_idx}')
                        params.append(tag_filter)
                        param_idx += 1
            
            where_sql = ""
            if where_clauses:
                where_sql = "WHERE " + " AND ".join(where_clauses)
            
            # Query ordering by cosine distance (<=>)
            # 1 - (embedding <=> query) is cosine similarity if normalized?
            # pgvector <=> operator returns cosine distance (0..2). 
            # Similarity = 1 - distance (approx).
            
            sql = f"""
                SELECT 
                    id, 
                    "userId", "fileId", "fileName", "content", "chunkIndex", "tags", "type", "documentId",
                    1 - (embedding <=> $1::vector) as score
                FROM "DocumentChunk"
                {where_sql}
                ORDER BY embedding <=> $1::vector
                LIMIT $2
            """
            
            # Execute
            rows = await db.query_raw(sql, *params)
            
            matches = []
            for row in rows:
                # Map back to Pinecone-ish format
                matches.append({
                    "id": row['id'],
                    "score": float(row['score']),
                    "metadata": {
                        "userId": row['userId'],
                        "fileId": row['fileId'],
                        "fileName": row['fileName'],
                        "text": row['content'],
                        "chunkIndex": row['chunkIndex'],
                        "tags": row['tags'],
                        "type": row['type'],
                        "dbId": row['documentId']
                    }
                })
                
            return {"matches": matches}

        except Exception as e:
            logger.error(f"Error searching vectors in Supabase: {e}")
            raise e
    @staticmethod
    async def delete_vectors(file_id: str, user_id: str):
        """
        Delete vectors/chunks associated with a fileId.
        """
        try:
            query = 'DELETE FROM "DocumentChunk" WHERE "fileId" = $1 AND "userId" = $2'
            count = await db.execute_raw(query, file_id, user_id)
            logger.info(f"Deleted {count} chunks for file {file_id}")
            return count
        except Exception as e:
            logger.error(f"Error deleting vectors from Supabase: {e}")
            raise e

    @staticmethod
    async def update_tags(file_id: str, user_id: str, tags: List[str]):
        """
        Update tags for all chunks associated with a fileId.
        """
        try:
            # tags list -> Postgres Array
            query = 'UPDATE "DocumentChunk" SET "tags" = $1 WHERE "fileId" = $2 AND "userId" = $3'
            count = await db.execute_raw(query, tags, file_id, user_id)
            logger.info(f"Updated tags for {count} chunks for file {file_id}")
            return count
        except Exception as e:
            logger.error(f"Error updating tags in Supabase: {e}")
            raise e

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 150) -> List[str]:
        """
        Split long text into chunks using LangChain's RecursiveCharacterTextSplitter.
        """
        if not text:
            return []
        
        # Optimized separators for Japanese and English
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=overlap,
            separators=["\n\n", "\n", "。", "、", " ", ""] 
        )
        return text_splitter.split_text(text)
