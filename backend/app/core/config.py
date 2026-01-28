from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from dotenv import load_dotenv
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    app_name: str = Field(default="FinSight API")
    api_prefix: str = Field(default="/api")
    cors_origins: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            os.environ.get("FRONTEND_URL", ""),
        ]
    )

    # Azure Cosmos DB
    cosmos_endpoint: str = Field(default="", validation_alias="COSMOS_ENDPOINT")
    cosmos_key: str = Field(default="", validation_alias="COSMOS_KEY")
    cosmos_database: str = Field(default="", validation_alias="COSMOS_DATABASE")
    users_container: str = Field(default="users", validation_alias="COSMOS_USERS_CONTAINER")
    sessions_container: str = Field(default="sessions", validation_alias="COSMOS_SESSIONS_CONTAINER")
    feedback_container: str = Field(default="feedback", validation_alias="COSMOS_FEEDBACK_CONTAINER")
    providers_container: str = Field(default="providers", validation_alias="COSMOS_PROVIDERS_CONTAINER")
    models_container: str = Field(default="models", validation_alias="COSMOS_MODELS_CONTAINER")

    # Auth
    jwt_secret_key: str = Field(default="change-me", validation_alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=60 * 12, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    # Admin bootstrap
    admin_user_id: str = Field(default="admin", validation_alias="ADMIN_USER_ID")
    admin_name: str = Field(default="Admin User", validation_alias="ADMIN_NAME")
    admin_email: str = Field(default="admin@example.com", validation_alias="ADMIN_EMAIL")
    admin_password: str = Field(default="ChangeMe!123", validation_alias="ADMIN_PASSWORD")

    # Blob storage
    storage_connection_string: str = Field(default="", validation_alias="AZURE_STORAGE_CONNECTION_STRING")
    blob_container_name: str = Field(default="financial-pdfs", validation_alias="BLOB_CONTAINER_NAME")

    # Azure Document Intelligence
    docint_endpoint: str = Field(default="", validation_alias="AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
    docint_key: str = Field(default="", validation_alias="AZURE_DOCUMENT_INTELLIGENCE_KEY")
    docint_api_version: str = Field(default="2024-11-30", validation_alias="AZURE_DOCUMENT_INTELLIGENCE_API_VERSION")

    # Azure AI Search
    search_endpoint: str = Field(default="", validation_alias="AZURE_SEARCH_ENDPOINT")
    search_admin_key: str = Field(default="", validation_alias="AZURE_SEARCH_ADMIN_KEY")
    search_index_name: str = Field(default="financials-chunks1", validation_alias="AZURE_SEARCH_INDEX_NAME")
    search_indexer_name: str = Field(default="financials-indexer1", validation_alias="AZURE_SEARCH_INDEXER_NAME")

    # Azure OpenAI
    azure_openai_api_key: str = Field(default="", validation_alias="AZURE_OPENAI_API_KEY")
    azure_openai_endpoint: str = Field(default="", validation_alias="AZURE_OPENAI_ENDPOINT")
    azure_openai_api_version: str = Field(default="2025-01-01-preview", validation_alias="AZURE_OPENAI_API_VERSION")
    azure_openai_chat_deployment: str = Field(default="", validation_alias="AZURE_OPENAI_CHAT_DEPLOYMENT_NAME")
    azure_openai_text_deployment: str = Field(default="", validation_alias="AZURE_OPENAI_TEXT_DEPLOYMENT_NAME")
    azure_openai_embedding_deployment: str = Field(default="", validation_alias="AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME")
    azure_openai_embed_dims: int = Field(default=1536, validation_alias="AZURE_OPENAI_EMBED_DIMS")

    # Feature flags
    production: bool = Field(default=False, validation_alias="PRODUCTION")
    seed_mock_results: bool = Field(default=True, validation_alias="SEED_MOCK_RESULTS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="allow",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: List[str] | str) -> List[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache()
def get_settings() -> Settings:
    return Settings()
