import json
import time
from openai import AzureOpenAI
from openai.types.chat import ChatCompletionMessageParam
from typing import Any, Dict, Iterable, List, Optional, Type, cast
from pydantic import BaseModel
from app.core.config import get_settings
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential, AzureCliCredential
from azure.ai.projects.models import MemoryStoreDefaultDefinition, MemoryStoreDefaultOptions, MemorySearchTool, PromptAgentDefinition

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
    
    def create_or_retrieve_memory_store(
        self, 
        name: str, 
        model: Optional[str] = None
        ) -> str:
        # Check if a memory store with the given name already exists
        existing_stores = self.project_client.memory_stores.list()
        for store in existing_stores:
            if store.name == name:
                return store.name
        
        # If not, create a new memory store
        options = MemoryStoreDefaultOptions(
            chat_summary_enabled=True,
            user_profile_enabled=True,
            user_profile_details="Avoid irrelevant or sensitive data, such as age, precise location, and credentials"
        )
        
        definition = MemoryStoreDefaultDefinition(
            chat_model= model or self.chat_model,
            embedding_model=self.embedding_model,
            options=options
        )
        
        memory_store = self.project_client.memory_stores.create(
            name=name,
            definition=definition,
            description="Memory store for customer support agent",
        )
        
        return memory_store.name
    
    def delete_memory_store(self, name: str) -> None:
        # Delete a memory store by name
        existing_stores = self.project_client.memory_stores.list()
        for store in existing_stores:
            if store.name == name:
                self.project_client.memory_stores.delete(store.id)
                return
    
    def create_or_retrieve_agent(
        self,
        name: str,
        instructions: str,
        memory_store_name: Optional[str] = None,
        memory_scope: Optional[str] = None,
        model: Optional[str] = None,
        
    ) -> str:
        existing_agents = self.project_client.agents.list()
        for agent in existing_agents:
            if agent.name == name:
                return agent.name
            
        tools = []
        if memory_store_name:
            tools.append(MemorySearchTool(
                memory_store_name=memory_store_name,
                scope=memory_scope if memory_scope else "all",
                update_delay=1,
            ))
            
        def test_tool(input: str) -> str:
            return f"Test tool received input: {input}"
        
        tools.append(test_tool)
        
        agent = self.project_client.agents.create_version(
            agent_name=name,
            definition=PromptAgentDefinition(
                model=model or self.chat_model,
                instructions=instructions,
                tools=tools,
            )
        )
        
        return agent.name
    
    def delete_agent(self, name: str) -> None:
        existing_agents = self.project_client.agents.list()
        for agent in existing_agents:
            if agent.name == name:
                self.project_client.agents.delete(agent.id)
                return
    
    def create_or_retrieve_conversation(
        self,
        conversation_id: str,
    ) -> str:
        openai_client = self.project_client.get_openai_client()
        try:
            conversation = openai_client.conversations.retrieve(conversation_id)
            if conversation:
                return conversation.id
        except Exception:
            conversation = openai_client.conversations.create()
        return conversation.id
        
        
    
    def run_agent(
        self,
        agent_name: str,
        prompt: str,
        conversation_id: str,
    ) -> Any:
        openai_client = self.project_client.get_openai_client()
        response = openai_client.responses.create(
            input=prompt,
            conversation=conversation_id,
            extra_body={"agent": {"name": agent_name, "type": "agent_reference"}},
        )
        return response
        
            
    
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
    session_id = "testst"
    memory = azure_factory.create_or_retrieve_memory_store("test-memory-store")
    print("Memory Store Name:", memory)
    agent = azure_factory.create_or_retrieve_agent(
        name="test-agent",
        instructions="You are a helpful assistant that can use the provided memory store to answer questions.",
        memory_store_name=memory,
        memory_scope="all",
    )
    print("Agent Name:", agent)
    conversation = azure_factory.create_or_retrieve_conversation("mwoq")
    print("Conversation ID:", conversation)
    response = azure_factory.run_agent(
        agent_name=agent,
        prompt="I prefer dark roast coffee",
        conversation_id=conversation,
    )
    print("Agent Response:", response)
    # time.sleep(65)
    new_conversation = azure_factory.create_or_retrieve_conversation(conversation)
    print("New Conversation ID:", new_conversation)
    response2 = azure_factory.run_agent(
        agent_name=agent,
        prompt="Please order my usual coffee",
        conversation_id=new_conversation,
    )
    print("Agent Response 2:", response2)