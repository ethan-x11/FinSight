from __future__ import annotations

from datetime import datetime, timezone

from azure.cosmos import exceptions as cosmos_exceptions  # type: ignore[import]

CosmosResourceNotFoundError = cosmos_exceptions.CosmosResourceNotFoundError

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.cosmos import ensure_containers, get_container


def seed_initial_data() -> None:
    ensure_containers()
    seed_admin_user()
    seed_providers()
    seed_models()


def seed_admin_user() -> None:
    settings = get_settings()
    container = get_container(settings.users_container)
    try:
        container.read_item(settings.admin_user_id, partition_key=settings.admin_user_id)
    except CosmosResourceNotFoundError:
        now = datetime.now(timezone.utc).isoformat()
        container.create_item(
            {
                "id": settings.admin_user_id,
                "name": settings.admin_name,
                "email": settings.admin_email,
                "password": hash_password(settings.admin_password),
                "isAdmin": True,
                "joinDate": now,
                "sessionCount": 0,
                "lastActive": now,
            }
        )


def seed_providers() -> None:
    settings = get_settings()
    container = get_container(settings.providers_container)
    providers = [
        {"id": "azureopenai", "name": "AzureOpenAI"},
        {"id": "openai", "name": "OpenAI"},
    ]
    for provider in providers:
        container.upsert_item(provider)


def seed_models() -> None:
    settings = get_settings()
    container = get_container(settings.models_container)
    models = [
        {
            "id": settings.azure_openai_chat_deployment or "gpt-4o",
            "name": "Chat Model",
            "description": "Primary chat deployment",
            "providerId": "azureopenai",
        },
        {
            "id": settings.azure_openai_embedding_deployment or "text-embedding-ada-002",
            "name": "Embedding Model",
            "description": "Vector embedding deployment",
            "providerId": "azureopenai",
        },
    ]
    for model in models:
        container.upsert_item(model)
