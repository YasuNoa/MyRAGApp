from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import logging
import traceback
from datetime import datetime, timezone, timedelta
from prisma import Prisma
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from db import db
from prompts import CHAT_SYSTEM_PROMPT
from search_service import SearchService
from services.vector_service import VectorService

# Setup Logger
logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Clients
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

genai.configure(api_key=GOOGLE_API_KEY)
genai.configure(api_key=GOOGLE_API_KEY)
search_service = SearchService()

class AskRequest(BaseModel):
    query: str
    userId: str
    threadId: Optional[str] = None
    tags: List[str] = []
    # userPlan removed - strictly backend managed

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

# Logic moved to UserService
from services.user_service import UserService

# Logic moved to UserService
# check_and_increment_chat_limit is now in UserService

# ... (search_documents_by_filename remains same) ...

async def search_documents_by_filename(user_id: str, query: str):
    query_sql = """
        SELECT id, title, content FROM "Document"
        WHERE "userId" = $1
    """
    docs = await db.query_raw(query_sql, user_id)
    matches = []
    norm_query = query.lower().replace("_", " ")
    for doc in docs:
        title = doc['title']
        if not title: continue
        base = os.path.splitext(title)[0]
        norm_title = base.lower().replace("_", " ")
        if len(norm_title) < 2: continue
        if norm_title in norm_query:
            matches.append(doc)
    return matches

# --- Endpoint ---

@router.post("/ask")
async def ask(request: AskRequest):
    logger.info(f"Received ask request from {request.userId}")
    
    try:
        # 1. Resolve User ID (Handle Provider ID)
        user_id = await UserService.resolve_user_id(request.userId)
        logger.info(f"User Resolved: {request.userId} -> {user_id}")
        
        # 2. Check Limits & Get Plan
        await UserService.check_and_increment_chat_limit(user_id)
        current_plan = await UserService.get_user_plan(user_id)
        logger.info(f"User {user_id} is on plan: {current_plan}")

        # 0. Thread/Message Management (Prisma)
        thread_id = request.threadId
        if not thread_id:
            title = request.query[:30] + "..." if len(request.query) > 30 else request.query
            thread = await db.thread.create(
                data={'userId': user_id, 'title': title}
            )
            thread_id = thread.id
        else:
            thread = await db.thread.find_unique(where={'id': thread_id})
            if not thread or thread.userId != user_id:
                 thread = await db.thread.create(
                    data={'userId': user_id, 'title': request.query[:30]}
                )
                 thread_id = thread.id
            else:
                await db.thread.update(where={'id': thread_id}, data={'updatedAt': datetime.now()})

        # Save User Message
        await db.message.create(
            data={
                'content': request.query,
                'role': 'user',
                'userId': user_id,
                'threadId': thread_id
            }
        )

        # Limits checked above
        # await check_and_increment_chat_limit(request.userId, sub)
        
        # 2. RAG Logic
        query_embedding = get_embedding(request.query)
        logger.info(f"Generated embedding for query: '{request.query}' (len: {len(query_embedding)})")
        
        filter_dict = {"userId": user_id}
        if request.tags:
             filter_dict["tags"] = {"$in": request.tags}
             
        logger.info(f"Searching Supabase Vector with filter: {filter_dict}")
        
        search_results = await VectorService.search_vectors(
            query_embedding=query_embedding,
            top_k=20,
            filter=filter_dict
        )
        
        matches_count = len(search_results['matches']) if search_results and 'matches' in search_results else 0
        matches_count = len(search_results['matches']) if search_results and 'matches' in search_results else 0
        logger.info(f"Vector search returned {matches_count} matches.")

        context_parts = []
        seen_ids = set()
        
        if search_results['matches']:
            for i, match in enumerate(search_results['matches']):
                logger.info(f"Processing Match [{i}]: ID={match['id']}, Score={match['score']}")
                meta = match['metadata']
                # logger.info(f"  Metadata: {meta}")
                
                # Use metadata dbId/fileId or fallback to the vector ID itself (which is often the doc ID)
                doc_id = meta.get('dbId') or meta.get('fileId') or match['id']
                logger.info(f"  Resolved Doc ID: {doc_id}")
                
                content = None
                if doc_id and doc_id not in seen_ids:
                    # Fetch content via Prisma (Standard ID only)
                    doc = await db.document.find_unique(where={'id': doc_id})
                    
                    if doc:
                        logger.info(f"  > Found Document in DB: {doc.title}")
                        if doc.content:
                            content = doc.content
                            context_parts.append(f"Source: {doc.title}\n\n{content}")
                            seen_ids.add(doc_id)
                        else:
                            logger.warning(f"  > Document found but no content.")
                    else:
                        logger.warning(f"  > Document NOT found in DB for ID: {doc_id}")
                
                if not content:
                    excerpt = meta.get('text', '')
                    logger.info(f"  > Using raw text from metadata (len: {len(excerpt)})")
                    context_parts.append(f"Source: {meta.get('fileName')} (Excerpt)\n\n{excerpt}")

        file_matches = await search_documents_by_filename(user_id, request.query)
        for doc in file_matches:
            if doc['id'] not in seen_ids:
                 context_parts.append(f"Source: {doc['title']} (Filename Match)\n\n{doc['content']}")
                 seen_ids.add(doc['id'])

        if not context_parts:
            context = "関連する学習データは見つかりませんでした。"
        else:
            context = "\n\n---\n\n".join(context_parts)
            
        # Web Search logic
        internal_keywords = ["登録", "ファイル", "要約", "データ", "registered", "file", "data"]
        is_internal = any(k in request.query for k in internal_keywords)
        
        web_result = ""
        context_missing = context == "関連する学習データは見つかりませんでした。"
        
        if is_internal and context_missing:
             web_result = "(Skipped Web Search)"
        else:
             # Use the authoritative user_plan from DB
             web_result = search_service.search(request.query, current_plan)

        # Generate Answer
        model = genai.GenerativeModel('gemini-2.0-flash', system_instruction=CHAT_SYSTEM_PROMPT)
        prompt = f"""
        Context:
        {context}
        
        Web Search:
        {web_result}
        
        Question:
        {request.query}
        
        Answer (Japanese):
        """
        
        response = model.generate_content(prompt)
        answer = response.text
        
        # Save Assistant Message
        await db.message.create(
            data={
                'content': answer,
                'role': 'assistant',
                'userId': user_id,
                'threadId': thread_id
            }
        )
        
        return {
            "answer": answer,
            "sources": [],
            "threadId": thread_id
        }

    except Exception as e:
        logger.error(f"Ask Error: {e}")
        logger.error(traceback.format_exc()) # Log full stack trace
        raise HTTPException(status_code=500, detail=str(e))
