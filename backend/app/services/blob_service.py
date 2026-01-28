from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Tuple

from azure.storage.blob import (
    BlobServiceClient,
    BlobSasPermissions,
    ContentSettings,
    generate_blob_sas,
)

from app.core.config import get_settings


class BlobService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.storage_connection_string:
            raise RuntimeError("AZURE_STORAGE_CONNECTION_STRING is required")
        self.container_name = settings.blob_container_name
        self.client = BlobServiceClient.from_connection_string(settings.storage_connection_string)
        self.container = self.client.get_container_client(self.container_name)
        self._ensure_container()

    def _ensure_container(self) -> None:
        if not self.container.exists():
            self.container.create_container()

    def upload_file(self, filename: str, data: bytes, content_type: str | None = None) -> Tuple[str, str]:
        safe_name = filename.replace(" ", "_")
        blob_name = f"uploads/{uuid.uuid4().hex}_{safe_name}"
        blob_client = self.container.get_blob_client(blob_name)

        blob_client.upload_blob(
            data,
            overwrite=True,
            content_settings=ContentSettings(content_type=content_type or "application/octet-stream"),
        )

        account_name = self.client.account_name
        account_key = getattr(self.client.credential, "account_key", None)
        if not account_name or not account_key:
            raise RuntimeError("Azure Storage account name and key are required to generate a SAS URL")

        sas_token = generate_blob_sas(
            account_name=account_name,
            container_name=self.container_name,
            blob_name=blob_name,
            account_key=account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.now(timezone.utc) + timedelta(hours=1),
        )

        sas_url = f"{blob_client.url}?{sas_token}"
        return blob_name, sas_url
