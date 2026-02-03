from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class BlobMeta(BaseModel):
    blobName: str
    blobUrl: str

class UploadResponse(BaseModel):
    sessionId: str
    blobData: list[BlobMeta]
    indexerRunStarted: bool
    createdAt: datetime

