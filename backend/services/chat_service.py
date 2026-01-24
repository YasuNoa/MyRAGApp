
# チャット機能（RAGを含む対話ロジック、履歴管理）を担当するサービス
import os
import logging
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from datetime import datetime, timezone
import traceback

import json
from db import db
from services.prompts import CHAT_SYSTEM_PROMPT, INTENT_CLASSIFICATION_PROMPT
from search_service import SearchService
from services.vector_service import VectorService
from services.user_service import UserService

# Setup Logger
logger = logging.getLogger(__name__)

# Initialize Clients
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

class ChatService:
    def __init__(self):
        self.search_service = SearchService()

    @staticmethod
    def classify_intent(text: str) -> Dict[str, Any]:
        """
        ユーザーの入力意図 (Intent) をGeminiを使って分類します。
        例: "チャットしたい", "検索したい", "保存したい" などを判別し、適切な処理に振り分けるために使用します。
        """
        try:
            prompt = INTENT_CLASSIFICATION_PROMPT.format(text=text)
            
            model = genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content(prompt)
            text_resp = response.text.strip()
            
            # Clean up code blocks if present
            if text_resp.startswith("```json"):
                text_resp = text_resp[7:-3]
            elif text_resp.startswith("```"):
                text_resp = text_resp[3:-3]
                
            return json.loads(text_resp)
        except Exception as e:
            logger.error(f"Error classifying intent: {e}")
            # Fallback
            return {"intent": "CHAT", "tags": ["General"]}

    async def ask(self, query: str, user_id: str, thread_id: Optional[str] = None, tags: List[str] = []) -> Dict[str, Any]:
        """
        RAG Process:
        1. Resolve User
        2. Check Limits
        3. Thread Management
        4. Vector Search (RAG)
        5. Web Search (Optional)
        6. Generate Answer
        """
        logger.info(f"ChatService: Received ask request from {user_id}")

        try:
            # 1. Resolve User ID (Handle Provider ID)
            resolved_user_id = await UserService.resolve_user_id(user_id)
            logger.info(f"User Resolved: {user_id} -> {resolved_user_id}")
            
            # 2. Check Limits & Get Plan
            await UserService.check_and_increment_chat_limit(resolved_user_id)
            current_plan = await UserService.get_user_plan(resolved_user_id)
            logger.info(f"User {resolved_user_id} is on plan: {current_plan}")

            # 3. Thread/Message Management
            if not thread_id:
                title = query[:30] + "..." if len(query) > 30 else query
                thread = await db.thread.create(
                    data={'userId': resolved_user_id, 'title': title}
                )
                thread_id = thread.id
            else:
                thread = await db.thread.find_unique(where={'id': thread_id})
                if not thread or thread.userId != resolved_user_id:
                     thread = await db.thread.create(
                        data={'userId': resolved_user_id, 'title': query[:30]}
                    )
                     thread_id = thread.id
                else:
                    await db.thread.update(where={'id': thread_id}, data={'updatedAt': datetime.now()})

            # Save User Message
            await db.message.create(
                data={
                    'content': query,
                    'role': 'user',
                    'userId': resolved_user_id,
                    'threadId': thread_id
                }
            )

            # 4. RAG Logic (Vector Search)
            query_embedding = VectorService.get_embedding(query)
            logger.info(f"Generated embedding for query: '{query}'")
            
            filter_dict = {"userId": resolved_user_id}
            if tags:
                 filter_dict["tags"] = {"$in": tags}
                 
            search_results = await VectorService.search_vectors(
                query_embedding=query_embedding,
                top_k=20,
                filter=filter_dict
            )
            
            context_parts = []
            seen_ids = set()
            
            if search_results and 'matches' in search_results:
                for match in search_results['matches']:
                    meta = match['metadata']
                    # Use metadata dbId/fileId or fallback to the vector ID
                    doc_id = meta.get('dbId') or meta.get('fileId') or match['id']
                    
                    content = None
                    if doc_id and doc_id not in seen_ids:
                        # Fetch content via Prisma
                        doc = await db.document.find_unique(where={'id': doc_id})
                        if doc and doc.content:
                            content = doc.content
                            context_parts.append(f"Source: {doc.title}\n\n{content}")
                            seen_ids.add(doc_id)
                    
                    if not content:
                        excerpt = meta.get('text', '')
                        context_parts.append(f"Source: {meta.get('fileName')} (Excerpt)\n\n{excerpt}")

            # Filename Match Backup
            file_matches = await self.search_documents_by_filename(resolved_user_id, query)
            for doc in file_matches:
                if doc['id'] not in seen_ids:
                     context_parts.append(f"Source: {doc['title']} (Filename Match)\n\n{doc['content']}")
                     seen_ids.add(doc['id'])

            if not context_parts:
                context = "関連する学習データは見つかりませんでした。"
            else:
                context = "\n\n---\n\n".join(context_parts)
                
            # 5. Web Search logic
            internal_keywords = ["登録", "ファイル", "要約", "データ", "registered", "file", "data"]
            is_internal = any(k in query for k in internal_keywords)
            
            web_result = ""
            context_missing = context == "関連する学習データは見つかりませんでした。"
            
            if is_internal and context_missing:
                 web_result = "(Skipped Web Search)"
            else:
                 web_result = self.search_service.search(query, current_plan)

            # 6. Generate Answer
            model = genai.GenerativeModel('gemini-2.0-flash', system_instruction=CHAT_SYSTEM_PROMPT)
            prompt = f"""
            Context:
            {context}
            
            Web Search:
            {web_result}
            
            Question:
            {query}
            
            Answer (Japanese):
            """
            
            response = model.generate_content(prompt)
            answer = response.text
            
            # Save Assistant Message
            await db.message.create(
                data={
                    'content': answer,
                    'role': 'assistant',
                    'userId': resolved_user_id,
                    'threadId': thread_id
                }
            )
            
            return {
                "answer": answer,
                "sources": [],
                "threadId": thread_id
            }

        except Exception as e:
            logger.error(f"ChatService Ask Error: {e}")
            logger.error(traceback.format_exc())
            raise e

    async def search_documents_by_filename(self, user_id: str, query: str):
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
