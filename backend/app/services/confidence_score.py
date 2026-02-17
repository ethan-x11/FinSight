import logging
from typing import Any, Mapping

from app.core.config import get_settings
from app.utils.azure_factory import AzureFactory

from azure.ai.evaluation import GroundednessEvaluator

logger = logging.getLogger(__name__)


class ConfidenceScore:
    def __init__(self):
        self.azure_factory = AzureFactory()
        self.settings = get_settings()
        self.fail_score = 0.e0

        self.model_config = {
            "azure_endpoint": self.settings.azure_openai_endpoint,
            "api_key": self.settings.azure_openai_api_key,
            "azure_deployment": self.settings.azure_openai_eval_deployment,
            "api_version": self.settings.azure_openai_api_version,
        }

        self._groundedness_evaluator = GroundednessEvaluator(model_config=self.model_config)

    @staticmethod
    def _normalize_score(value: float) -> float:
        if value < 0:
            return 0.e0
        if value <= 1:
            return round(value, 4)
        if value <= 5:
            return round(value / 5, 4)
        if value <= 100:
            return round(value / 100, 4)
        return 1.0

    def _extract_groundedness_score(self, result: Mapping[str, Any]) -> float:
        candidates = (
            result.get("groundedness"),
            result.get("gpt_groundedness"),
            result.get("score"),
            (result.get("metrics") or {}).get("groundedness"),
        )

        for value in candidates:
            if isinstance(value, (int, float)):
                return self._normalize_score(float(value))

        return self.fail_score

    def get_confidence_score(
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
            result = evaluator(
                query=prompt,
                response=response,
                context=context,
            )
            with open("groundedness_debug.json", "w") as f:
                import json
                json.dump({
                    "query": prompt,
                    "response": response,
                    "context": context,
                    "evaluation_result": result,
                }, f, indent=4)
            if isinstance(result, Mapping):
                self.score = self._extract_groundedness_score(result)
                return self.score

            logger.warning("Unexpected groundedness evaluator output type: %s", type(result))
        except Exception as exc:
            logger.exception("Groundedness evaluation failed: %s", exc)

        return self.fail_score