from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, cast

from openai import AzureOpenAI
from openai.types.chat import ChatCompletionMessageParam

from app.core.config import get_settings


class ChatService:
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

    def generate_answer(
        self,
        question: str,
        context_docs: List[Dict[str, Any]],
        history: Optional[Iterable[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        context_str = "\n".join(
            [
                f"Source: {doc.get('sourcefile','unknown')} (Chunk {doc.get('chunkId','')})\n{doc.get('content','')}"
                for doc in context_docs
            ]
        )
        system_prompt = (
            "You are a financial report assistant. Answer with concise sentences and include citations"
            " referencing the provided sources."
        )
        history_messages: List[Dict[str, str]] = []
        if history:
            recent_messages = list(history)[-10:]
            for entry in recent_messages:
                role = entry.get("role")
                content = entry.get("content")
                if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
                    history_messages.append({"role": role, "content": content})
        messages = [
            {"role": "system", "content": system_prompt},
        ]
        if history_messages:
            messages.extend(history_messages)
        messages.append(
            {"role": "user", "content": f"Context:\n{context_str}\n\nQuestion: {question}"},
        )
        completion = self.client.chat.completions.create(
            model=self.chat_model, messages=cast(Iterable[ChatCompletionMessageParam], messages), 
            # temperature=0.2
        )
        answer = completion.choices[0].message.content if completion.choices else ""
        sources = [
            {
                "sourcefile": doc.get("sourcefile"),
                "chunk_id": doc.get("chunkId"),
                "heading": None,
                "page_range": doc.get("pageRange"),
                "content": doc.get("content"),
            }
            for doc in context_docs
        ]
        return {"answer": answer, "sources": sources}
