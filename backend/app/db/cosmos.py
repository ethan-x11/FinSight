from __future__ import annotations

from functools import lru_cache
from typing import Dict, Iterable

from azure.cosmos import CosmosClient, PartitionKey

from app.core.config import get_settings

ContainerConfig = Dict[str, str]


@lru_cache()
def get_cosmos_client() -> CosmosClient:
    settings = get_settings()
    if not settings.cosmos_endpoint or not settings.cosmos_key:
        raise RuntimeError("COSMOS_ENDPOINT and COSMOS_KEY must be configured before API startup.")
    return CosmosClient(settings.cosmos_endpoint, credential=settings.cosmos_key)


@lru_cache()
def get_database():
    settings = get_settings()
    client = get_cosmos_client()
    return client.create_database_if_not_exists(id=settings.cosmos_database)


def container_definitions() -> Iterable[ContainerConfig]:
    settings = get_settings()
    return [
        {"id": settings.users_container, "partition_key": "/id"},
        {"id": settings.sessions_container, "partition_key": "/userId"},
        {"id": settings.feedback_container, "partition_key": "/sessionId"},
        {"id": settings.providers_container, "partition_key": "/id"},
        {"id": settings.models_container, "partition_key": "/providerId"},
    ]


def ensure_containers() -> None:
    database = get_database()
    for definition in container_definitions():
        database.create_container_if_not_exists(
            id=definition["id"],
            partition_key=PartitionKey(path=definition["partition_key"]),
        )


def get_container(container_id: str):
    database = get_database()
    return database.get_container_client(container_id)
