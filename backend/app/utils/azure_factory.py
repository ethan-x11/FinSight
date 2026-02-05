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

    def embed_texts(self, texts: str | List[str] | Iterable[int] | Iterable[Iterable[int]]) -> List[List[float]]:
        response = self.client.embeddings.create(model=self.embedding_model, input=texts)
        return [item.embedding for item in response.data]
    
    
    def run_chat(
        self,
        user_message: str,
        system_message: Optional[str] = None,
        user_message_params: Optional[Any] = None,
        history: Optional[Iterable[Dict[str, Any]]] = None,
    ) -> Any:
                
        history_messages: List[Dict[str, str]] = []
        if history:
            recent_messages = list(history)[-10:]
            for entry in recent_messages:
                role = entry.get("role")
                content = entry.get("content")
                if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
                    history_messages.append({"role": role, "content": content})
                    
        messages = [
            {"role": "system", "content": system_message},
        ]
        
        if history_messages:
            messages.extend(history_messages)
            
        messages.append(
            {"role": "user", "content": user_message},
        )
        completion = self.client.chat.completions.create(
            model=self.chat_model, 
            messages=cast(Iterable[ChatCompletionMessageParam], messages), 
            # temperature=0.2,
            reasoning_effort = "high",
        )
        
        answer = completion.choices[0].message.content if completion.choices else ""
        
        return answer 
    

if __name__ == "__main__":
    azure_factory = AzureFactory()
    response = azure_factory.run_chat(
        user_message="Derive the formula for validating prime number of million digit numbers.",
        system_message="You are a helpful assistant.",
    )
    print("Response:", response)