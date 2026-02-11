from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional
from uuid import uuid4
from app.models.session import AnalysisOutput, Insight, KeyInsight
from app.services.chat_service import ChatService
from app.services.search_service import SearchService
from app.services.query_planner import QueryPlanner
from app.services.attribute_finder import AttributeFinder
from app.models.user import UserAttribute


class AnalysisService:
    def __init__(self):
        self.chat_service = ChatService()
        self.search_service = SearchService()
        self.query_planner = QueryPlanner()
        self.attribute_finder = AttributeFinder()

    def generate_insights(
        self,
        file_name: str,
        index_name: str,
        attributes: Optional[List[UserAttribute]] = None,
    ) -> AnalysisOutput:
        prompt = (
            "Generate key insights and risk factors based on the analyzed document."
        )
        query_plan = self.query_planner.plan_query(prompt)

        queries = [prompt]
        queries.extend([queryObj.query for queryObj in query_plan.queries])

        results = self.search_service.search_single_batch(index_name, queries, top=8)

        insights = self.chat_service.generate_answer(
            prompt,
            results,
        )

        # print("Generated Insights:", insights)

        key_insights: List[KeyInsight] = []

        if attributes:
            for attr in attributes:
                attribute_value = self.attribute_finder.find_attribute(
                    name=attr.name,
                    description=attr.description,
                    index_name=index_name,
                )
                key_insights.append(
                    KeyInsight(
                        id=uuid4().hex,
                        name=attribute_value.name,
                        description=attr.description,
                        value=attribute_value.value,
                        trend=attribute_value.trend,
                        citation=attribute_value.citation,
                    )
                )

        return AnalysisOutput(
            fileName=file_name,
            keyInsights=key_insights
            or [
                KeyInsight(
                    id=uuid4().hex,
                    name="Auto Insight",
                    description="Automatically generated insight based on document content",
                    value="Document processed",
                    trend=None,
                    confidenceScore=0.85,
                )
            ],
            risks=[],
            notes=insights.answer,
        )
