import os
from typing import List, Optional
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_community.utilities import GoogleSerperAPIWrapper, GoogleSearchAPIWrapper
from langchain_core.tools import Tool

class SearchService:
    def __init__(self):
        self.ddg = DuckDuckGoSearchRun()
        
        # Serper API Key should be in environment variables as SERPER_API_KEY
        try:
            self.serper = GoogleSerperAPIWrapper()
        except Exception as e:
            print(f"[SearchService] Warning: Serper API not available ({e}). Standard search will fail.")
            self.serper = None

        # Google Custom Search (Premium)
        # Requires GOOGLE_API_KEY and GOOGLE_CSE_ID
        try:
            self.google_cse = GoogleSearchAPIWrapper()
        except Exception as e:
            print(f"[SearchService] Warning: Google Custom Search API not available ({e}). Premium search will fail.")
            self.google_cse = None

    def search(self, query: str, plan: str = "FREE") -> str:
        """
        Executes a search based on the user's plan.
        
        Args:
            query: The search query.
            plan: The user's subscription plan (FREE, STANDARD, PREMIUM).
            
        Returns:
            A string containing the search results.
        """
        print(f"[SearchService] Searching for '{query}' with plan '{plan}'")
        
        try:
            if plan == "FREE":
                return self._search_ddg(query)
            elif plan == "STANDARD":
                return self._search_serper(query)
            elif plan == "PREMIUM":
                return self._search_google_custom(query)
            else:
                # Default to DDG for unknown plans
                return self._search_ddg(query)
        except Exception as e:
            print(f"[SearchService] Error during search: {e}")
            return f"Search failed: {str(e)}"

    def _search_ddg(self, query: str) -> str:
        print("[SearchService] Using DuckDuckGo")
        # DuckDuckGoSearchRun returns a string summary of results
        return self.ddg.run(query)

    def _search_serper(self, query: str) -> str:
        print("[SearchService] Using Serper (Google)")
        if not self.serper:
            return "Error: Serper API Key is missing. Please set SERPER_API_KEY in .env."
        # GoogleSerperAPIWrapper.run returns a string summary
        return self.serper.run(query)

    def _search_google_custom(self, query: str) -> str:
        print("[SearchService] Using Google Custom Search API")
        if not self.google_cse:
            return "Error: Google Custom Search API not configured. Please set GOOGLE_API_KEY and GOOGLE_CSE_ID in .env."
        return self.google_cse.run(query)
