from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.session import KeyInsight, RiskFactor


class InsightsResponse(BaseModel):
    sessionId: str
    keyInsights: List[KeyInsight] = Field(default_factory=list)
    risks: List[RiskFactor] = Field(default_factory=list)
    # structuredTables: List[FinancialTable] = Field(default_factory=list)
    notes: Optional[str] = None
