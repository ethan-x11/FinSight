from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


ProcessStage = Literal["pending", "processing", "completed", "failed"]


class ProcessingSteps(BaseModel):
    docIntelligenceTriggered: bool = False
    tablesExtracted: bool = False
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


class Citation(BaseModel):
    label: Optional[str] = None
    snippet: Optional[str] = None
    pageIndex: Optional[int] = None


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


class FinancialTable(BaseModel):
    tableId: str
    title: str
    pageNumber: int
    layoutType: Literal["horizontal", "top-bottom", "matrix"]
    dataRef: Optional[str] = None
    rows: Optional[List[dict]] = None


class AnalysisOutput(BaseModel):
    keyInsights: List[KeyInsight] = Field(default_factory=list)
    identifiedRisks: List[RiskFactor] = Field(default_factory=list)
    structuredTables: List[FinancialTable] = Field(default_factory=list)


class AnalysisSession(BaseModel):
    id: str
    userId: str
    type: Literal["analysis_session"] = "analysis_session"
    version: str = "1.0"
    metadata: SessionMetadata
    sourceDocument: SourceDocument
    systemStatus: ProcessingStatus
    analysisOutput: Optional[AnalysisOutput] = None
    chatHistory: List[ChatMessage] = Field(default_factory=list)


class SessionCreate(BaseModel):
    id: Optional[str] = None
    userId: str
    metadata: SessionMetadata
    sourceDocument: SourceDocument
    analysisOutput: Optional[AnalysisOutput] = None


class SessionUpdate(BaseModel):
    metadata: Optional[SessionMetadata] = None
    sourceDocument: Optional[SourceDocument] = None
    systemStatus: Optional[ProcessingStatus] = None
    analysisOutput: Optional[AnalysisOutput] = None
    chatHistory: Optional[List[ChatMessage]] = None
