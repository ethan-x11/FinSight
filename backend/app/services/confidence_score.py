import logging
from typing import Any, Mapping

from app.core.config import get_settings
from app.utils.azure_factory import AzureFactory
from openai import AsyncOpenAI
from ragas.llms import llm_factory
from ragas.metrics.collections import ResponseGroundedness

from app.utils.azure_factory import AzureFactory

# from azure.ai.evaluation import GroundednessEvaluator

logger = logging.getLogger(__name__)


class ConfidenceScore:
    def __init__(self):
        self.azure_factory = AzureFactory()
        self.settings = get_settings()
        self.fail_score = 0.e0

        # self.model_config = {
        #     "azure_endpoint": self.settings.azure_openai_endpoint,
        #     "api_key": self.settings.azure_openai_api_key,
        #     "azure_deployment": self.settings.azure_openai_eval_deployment,
        #     "api_version": self.settings.azure_openai_api_version,
        # }
        self.eval_deployment = self.settings.azure_openai_eval_deployment
        
        self.async_client = self.azure_factory.async_client
        self.llm = llm_factory(self.eval_deployment, client=self.async_client)
        self._groundedness_evaluator = ResponseGroundedness(llm=self.llm)

    async def get_confidence_score(
        self,
        prompt: str,
        response: str,
        context: str) -> float:
        evaluator = self._groundedness_evaluator
        if evaluator is None:
            return self.fail_score

        if not response.strip() or not context.strip():
            return self.fail_score

        try:
            result = await evaluator.ascore(
                response=response,
                retrieved_contexts=[context])
            
            with open("confidence_score_debug.log", "a", encoding="utf-8") as log_file:
                log_file.write(f"Prompt: {prompt}\nResponse: {response}\nContext: {context}\nScore: {result.value}\n\n")
            return result.value

        except Exception as exc:
            logger.exception("Groundedness evaluation failed: %s", exc)

        return self.fail_score
    
    
# from openai import AsyncOpenAI
# from ragas.llms import llm_factory
# from ragas.metrics.collections import ResponseGroundedness

# from app.utils.azure_factory import AzureFactory

# # Setup LLM
# azure_factory = AzureFactory()
# client = azure_factory.async_client
# llm = llm_factory("gpt-4o-mini", client=client)

# # Create metric
# scorer = ResponseGroundedness(llm=llm)
# async def evaluate():
#     result = await scorer.ascore(
#         response="The Eiffel Tower is located in Paris.",
#         retrieved_contexts=["The Eiffel Tower is located in Paris. It has a height of 1000ft.",])
    
#     print(f"Groundedness Score: {result.value}")
    
# if __name__ == "__main__":
#     import asyncio
#     asyncio.run(evaluate())


if __name__ == "__main__":
    import asyncio

    confidence_score_service = ConfidenceScore()
    score = asyncio.run(confidence_score_service.get_confidence_score(
        prompt="Where is the Eiffel Tower located?",
        response="The Eiffel Tower is located in Paris.",
        context="The Eiffel Tower is located in Paris and World. It has a height of 1000ft."
    ))
    print(f"Confidence Score: {score}")