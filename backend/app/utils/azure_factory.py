from openai import AzureOpenAI
from openai.types.chat import ChatCompletionMessageParam
from typing import Any, Dict, Iterable, List, Optional, cast

from app.core.config import get_settings

class AzureFactory():
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.azure_openai_endpoint or not settings.azure_openai_api_key:
            raise RuntimeError("Azure OpenAI configuration missing")
        self.client = AzureOpenAI(
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
            azure_endpoint=settings.azure_openai_endpoint,
        )
        self.chat_model = settings.azure_openai_chat_deployment
        self.embedding_model = settings.azure_openai_embedding_deployment

    def embed_texts(self, texts: Iterable[str]) -> List[List[float]]:
        response = self.client.embeddings.create(model=self.embedding_model, input=list(texts))
        return [item.embedding for item in response.data]