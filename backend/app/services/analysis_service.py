from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional
from uuid import uuid4
from app.models.session import AnalysisOutput, Insight, KeyInsight
from app.services.chat_service import ChatService
from app.services.search_service import SearchService
from app.services.query_planner import QueryPlanner
from app.services.attribute_finder import AttributeFinder
from app.models.user import UserAttributes


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
        attributes: Optional[List[UserAttributes]] = None,
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

        attribute_values: List[Insight] = []

        if attributes:
            for attr in attributes:
                attribute_values.append(
                    self.attribute_finder.find_attribute(
                        name=attr.name,
                        description=attr.description,
                        index_name=index_name,
                    )
                )

        key_insights = [
            KeyInsight(
                id=uuid4().hex,
                category=attr.category,
                value=attr.value,
                trend=attr.trend,
                citation=attr.citation,
            )
            for attr in attribute_values
        ]

        return AnalysisOutput(
            fileName=file_name,
            keyInsights = key_insights or [
                KeyInsight(
                    id=uuid4().hex,
                    category="Auto Insight",
                    value="Document processed",
                    trend=None,
                    confidenceScore=0.85,
                )
            ],
            risks=[],
            notes=insights.answer,
        )
