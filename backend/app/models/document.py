from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class BlobMeta(BaseModel):
    blobName: str
    blobUrl: str

class UploadResponse(BaseModel):
    sessionId: str
    blobData: list[BlobMeta]
    indexerRunStarted: bool
    createdAt: datetime


class AskRequest(BaseModel):
    question: str
    top_k: int = 8


class SourceSnippet(BaseModel):
    sourcefile: str
    chunk_id: str
    heading: Optional[str] = None
    page_range: Optional[str] = None
    content: str


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceSnippet]
