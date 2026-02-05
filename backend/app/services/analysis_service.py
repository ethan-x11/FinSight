from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List
from uuid import uuid4
from app.models.session import AnalysisOutput, KeyInsight
from app.services.chat_service import ChatService
from app.services.search_service import SearchService
from app.services.query_planner import QueryPlanner


class AnalysisService:
    def __init__(self):
        self.chat_service = ChatService()
        self.search_service = SearchService()
        self.query_planner = QueryPlanner()
        
    def generate_insights(self, file_name: str, index_name: str) -> AnalysisOutput:
        prompt = "Generate key insights and risk factors based on the analyzed document."
        query_plan = self.query_planner.plan_query(prompt)
        
        queries = [prompt]
        queries.extend([queryObj.query for queryObj in query_plan.queries])
        
        results = self.search_service.search_single_batch(index_name, queries, top=8)        

        insights = self.chat_service.generate_answer(
            prompt,
            results,
        )
        
        # print("Generated Insights:", insights)
        
        return AnalysisOutput(
            fileName=file_name,
            keyInsights=[
                KeyInsight(
                    id=uuid4().hex,
                    category="Auto Insight",
                    value="Document processed",
                    trend=None,
                    confidenceScore=0.85,
                )
            ],
            risks= [],
            notes= insights.answer,
        )