from uuid import uuid4
from app.models.session import AnalysisOutput, KeyInsight
from app.services.chat_service import ChatService
from app.services.search_service import SearchService


class AnalysisService:
    def __init__(self):
        self.chat_service = ChatService()
        self.search_service = SearchService()
        
    def generate_insights(self, file_name: str, index_name: str) -> AnalysisOutput:
        prompt = "Generate key insights and risk factors based on the analyzed document."
        chunks = self.search_service.search_single(index_name, prompt, top=8)
        insights = self.chat_service.generate_answer(
            prompt,
            chunks,
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