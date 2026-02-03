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


class AskRequest(BaseModel):
    question: str
    top_k: int = 8


class SourceSnippet(BaseModel):
    sourcefile: str
    chunk_id: str
    heading: Optional[str] = None
    page_range: Optional[str] = None
    document_url: Optional[str] = None
    content: str


class SourcePointer(BaseModel):
    raw_cite: str
    url: Optional[str] = None
    sourcefile: Optional[str] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    chunk_id: Optional[str] = None
    text_snapshot: Optional[str] = None


class AskResponse(BaseModel):
    messageId: str
    answer: str
    citations: list[SourceSnippet]
    linkedCitations: list[SourcePointer] = Field(default_factory=list, serialization_alias="LinkedCitation")
