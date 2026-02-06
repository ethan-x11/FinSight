import json
from openai import AzureOpenAI
from openai.types.chat import ChatCompletionMessageParam
from typing import Any, Dict, Iterable, List, Optional, Type, cast
from pydantic import BaseModel
from app.core.config import get_settings
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential, AzureCliCredential
# from azure.ai.projects.models import PromptAgentDefinition

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
        self.project_client = AIProjectClient(
            credential=DefaultAzureCredential() if settings.production else AzureCliCredential(),
            endpoint=settings.azure_ai_project_endpoint,
        )

    def embed_texts(self, texts: str | List[str] | Iterable[int] | Iterable[Iterable[int]]) -> List[List[float]]:
        response = self.client.embeddings.create(model=self.embedding_model, input=texts)
        return [item.embedding for item in response.data]
    
    
    def run_chat(
        self,
        user_message: str,
        system_message: Optional[str] = None,
        user_message_params: Optional[Any] = None,
        response_format: Optional[Type[BaseModel]] = None,
        model: Optional[str] = None,
        history: Optional[Iterable[Dict[str, Any]]] = None,
    ) -> dict[str, Any]:
                
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
        
        request_kwargs: Dict[str, Any] = {
            "model": model or self.chat_model,
            "messages": cast(Iterable[ChatCompletionMessageParam], messages),
            "reasoning_effort": "high",
        }
        
        if response_format is not None:
            request_kwargs["response_format"] = response_format
        
        completion = self.client.chat.completions.parse(**request_kwargs)
        
        response = completion.choices[0].message.content if completion.choices else ""
        
        return {"response": response, "model": completion.model}
    
    # def create_agent(
    #     self, 
    #     agent_name: str, 
    #     instruction: Optional[str] = ""
    #     ) -> Any:
    #         agent = self.project_client.agents.create_agent(
    #             agent_name=agent_name,
    #             instruction=instruction,
    #             )

    
    
    def list_all_models(self) -> Any:
        #List all deployed models
        response = self.client.models.list()
        return response.model_dump_json()
    
    def list_chat_deployments(self) -> Any:
        #List all deployments
        response = self.project_client.deployments.list()
        result: List[str] = []
        
        # for deployment in response:
        #     result.append(deployment.name) if deployment.get("capabilities").get("chat_completion") == "true" else None
        return response

    

if __name__ == "__main__":
    azure_factory = AzureFactory()
    class SimpleResponse(BaseModel):
        answer: str
        reasoning: str
        
    # response = azure_factory.run_chat(
    #     user_message="Derive the formula for validating prime number of million digit numbers.",
    #     system_message="You are a helpful assistant.",
    #     response_format=SimpleResponse,
    # )
    # print("Response:", response)
    
    deployments = azure_factory.list_chat_deployments()
    for deployment in deployments:
        print(deployment)
    print("Chat Deployments:", deployments)
   