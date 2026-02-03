from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field
from typing import Annotated

from app.models.document import SourcePointer


ProcessStage = Annotated[str, Field(pattern=r"^(pending|processing.*|completed|failed)$")]


class ProcessingSteps(BaseModel):
    docIntelligenceTriggered: bool = False
    dataExtracted: bool = False
    chunksGenerated: bool = False
    embeddingsGenerated: bool = False
    searchIndexed: bool = False


class ProcessingStatus(BaseModel):
    overallStatus: ProcessStage = "pending"
    steps: ProcessingSteps = Field(default_factory=ProcessingSteps)
    errorMessage: Optional[str] = None


class SessionMetadata(BaseModel):
    title: str
    createdAt: datetime
    lastAccessed: datetime
    isActive: bool = True


class SourceDocument(BaseModel):
    fileName: str
    fileSize: str
    blobPath: str
    blobContainer: str
    blobUrl: Optional[str] = None
    indexName: Optional[str] = None


class Citation(BaseModel):
    sourcefile: Optional[str] = None
    chunk_id: Optional[str] = None
    heading: Optional[str] = None
    page_range: Optional[str] = None
    document_url: Optional[str] = None
    content: Optional[str] = None


class FeedbackData(BaseModel):
    thumbRating: Literal["up", "down"]
    comment: Optional[str] = None
    submittedAt: datetime


class ChatMessage(BaseModel):
    messageId: str
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime
    citations: Optional[List[Citation]] = None
    linkedCitations: Optional[List[SourcePointer]] = None
    userFeedback: Optional[FeedbackData] = None
    isStreaming: bool = False


class KeyInsight(BaseModel):
    id: str
    category: str
    value: str
    trend: Optional[str] = None
    confidenceScore: float = Field(default=0.0, ge=0.0, le=1.0)


class RiskFactor(BaseModel):
    severity: Literal["Low", "Medium", "High"]
    description: str
    sourcePage: Optional[int] = None


# class FinancialTable(BaseModel):
#     tableId: str
#     title: str
#     pageNumber: int
#     layoutType: Literal["horizontal", "top-bottom", "matrix"]
#     dataRef: Optional[str] = None
#     rows: Optional[List[dict]] = None


class AnalysisOutput(BaseModel):
    fileName: str
    keyInsights: List[KeyInsight] = Field(default_factory=list)
    risks: List[RiskFactor] = Field(default_factory=list)
    # structuredTables: List[FinancialTable] = Field(default_factory=list)
    notes: Optional[str] = None


class AnalysisSession(BaseModel):
    id: str
    userId: str
    type: Literal["analysis_session"] = "analysis_session"
    version: str = "1.0"
    metadata: SessionMetadata
    sourceDocument: List[SourceDocument]
    systemStatus: ProcessingStatus
    analysisOutput: Optional[List[AnalysisOutput]] = Field(default_factory=list)
    chatHistory: List[ChatMessage] = Field(default_factory=list)


class SessionCreate(BaseModel):
    id: Optional[str] = None
    userId: str
    metadata: SessionMetadata
    sourceDocument: List[SourceDocument]


class SessionUpdate(BaseModel):
    metadata: Optional[SessionMetadata] = None
    sourceDocument: Optional[List[SourceDocument]] = None
    systemStatus: Optional[ProcessingStatus] = None
    analysisOutput: Optional[AnalysisOutput] = None
    chatHistory: Optional[List[ChatMessage]] = None
