# Web検索機能（Tavily API）を担当するサービス
import os
from typing import List, Optional
from tavily import TavilyClient
import logging

logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self):
        self.tavily_api_key = os.getenv("TAVILY_API_KEY")
        if self.tavily_api_key:
            self.tavily = TavilyClient(api_key=self.tavily_api_key)
        else:
            logger.warning("[SearchService] Warning: TAVILY_API_KEY not set. Search will fail.")
            self.tavily = None

    def search(self, query: str, plan: str = "FREE") -> str:
        """
        Executes a search using Tavily (Unified for all plans).
        """
        logger.info(f"[SearchService] Searching for '{query}' with plan '{plan}' (Using Tavily)")
        
        if not self.tavily:
            return "Error: TAVILY_API_KEY is missing. Please set it in .env."

        try:
            # Determine search depth based on plan
            # FREE: basic (1 credit), OTHERS: advanced (2 credits)
            search_depth = "basic" if plan == "FREE" else "advanced"
            logger.info(f"[SearchService] Using search_depth='{search_depth}' for plan '{plan}'")

            # Tavily Search
            # max_results=5 default
            response = self.tavily.search(query=query, search_depth=search_depth, max_results=5)
            
            # Format results for RAG
            # Response is a dict with "results": [{"title":..., "content":..., "url":...}]
            # Tavily "content" is usually a good summary/snippet.
            
            results = response.get("results", [])
            formatted_results = []
            
            for i, res in enumerate(results):
                title = res.get("title", "No Title")
                url = res.get("url", "#")
                content = res.get("content", "")
                formatted_results.append(f"Source {i+1}: {title} ({url})\n{content}")
                
            return "\n\n".join(formatted_results)

        except Exception as e:
            logger.error(f"[SearchService] Error during search: {e}")
            # セキュリティのため、詳細なエラー内容はクライアントに返却せず、汎用的なメッセージとする
            return "Search failed due to an internal error."

