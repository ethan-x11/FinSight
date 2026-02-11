from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated

from app.models.user import UserAttribute



ProcessStage = Annotated[str, Field(pattern=r"^(pending|processing.*|completed|failed|cancelling|cancelled)$")]


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
    cancelRequested: bool = False


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
    pointer_url: Optional[str] = None

class FeedbackData(BaseModel):
    thumbRating: Literal["up", "down"]
    comment: Optional[str] = None
    submittedAt: datetime


class ChatMessage(BaseModel):
    messageId: str
    role: Literal["user", "assistant", "system"]
    content: str
    model: Optional[str] = None
    reasoningSteps: List[ReasoningSteps] = Field(default_factory=list)
    timestamp: datetime
    queryPlan: Optional[List[Query]] = None
    citations: Optional[List[Citation]] = None
    linkedCitations: Optional[List[SourcePointer]] = None
    userFeedback: Optional[FeedbackData] = None
    isStreaming: bool = False


class AskRequest(BaseModel):
    question: str
    top_k: int = 8
    use_query_planner: Optional[bool] = True
    model: Optional[str] = None

class ChatResponseRaw(BaseModel):
    answer: str
    reasoningSteps: List[ReasoningSteps] = Field(default_factory=list)
    model_config = ConfigDict(extra='forbid')
    
class ChatResponse(BaseModel):
    answer: str
    model: Optional[str] = None
    reasoningSteps: List[ReasoningSteps] = Field(default_factory=list)
    citations: List[Citation] = Field(default_factory=list)
    linkedCitations: List[SourcePointer] = Field(default_factory=list)

class AskResponse(ChatResponse):
    messageId: str
    queryPlan: Optional[List[Query]] = None
    
class ReasoningSteps(BaseModel):
    title: str
    description: str
    model_config = ConfigDict(extra='forbid')

class SourcePointer(BaseModel):
    raw_cite: str
    url: Optional[str] = None
    sourcefile: Optional[str] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    chunk_id: Optional[str] = None
    text_snapshot: Optional[str] = None
    page_range: Optional[str] = None


class Insight(BaseModel):
    name: str
    value: str
    trend: str
    citation: str
    

class KeyInsight(BaseModel):
    id: str
    name: str
    description: str
    value: str
    trend: Optional[str] = None
    confidenceScore: Optional[float] = Field(default=0.0, ge=0.0, le=1.0)
    citation: Optional[str] = None

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
    conversationId: Optional[str] = None


class SessionCreate(BaseModel):
    id: Optional[str] = None
    userId: str
    metadata: SessionMetadata
    sourceDocument: List[SourceDocument]
    conversationId: Optional[str] = None


class SessionUpdate(BaseModel):
    metadata: Optional[SessionMetadata] = None
    conversationId: Optional[str] = None
    sourceDocument: Optional[List[SourceDocument]] = None
    systemStatus: Optional[ProcessingStatus] = None
    analysisOutput: Optional[AnalysisOutput] = None
    chatHistory: Optional[List[ChatMessage]] = None


class Query(BaseModel):
    query: str
    reasoning: Optional[str] = None

class QueryPlannerResponse(BaseModel):
    queries: List[Query] = Field(default_factory=list)
    

class AttributeInsightRequest(BaseModel):
    fileName: str
    attribute: UserAttribute