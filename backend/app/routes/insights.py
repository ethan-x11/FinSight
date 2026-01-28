from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.repositories.sessions import SessionsRepository, get_sessions_repository
from app.models.insights import InsightsResponse
from app.models.session import AnalysisOutput, KeyInsight, RiskFactor, FinancialTable
from app.models.user import UserInDB

router = APIRouter(tags=["insights"], dependencies=[Depends(get_current_user)])


@router.get("/insights/{session_id}", response_model=InsightsResponse)
async def get_insights(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user),
    sessions_repo: SessionsRepository = Depends(get_sessions_repository),
) -> InsightsResponse:
    session = sessions_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not current_user.isAdmin and session.get("userId") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    analysis = session.get("analysisOutput") or {}
    key_insights = analysis.get("keyInsights") or []
    risks = analysis.get("identifiedRisks") or []
    structured_tables = analysis.get("structuredTables") or []

    # Persist generated insights so subsequent calls return the same payload
    updated_analysis = AnalysisOutput(
        keyInsights=[KeyInsight(**item) for item in key_insights],
        identifiedRisks=[RiskFactor(**item) for item in risks],
        structuredTables=[FinancialTable(**item) for item in structured_tables],
    ).model_dump()
    sessions_repo.update_analysis(session_id, updated_analysis)

    return InsightsResponse(
        sessionId=session_id,
        keyInsights=[KeyInsight(**item) for item in key_insights],
        risks=[RiskFactor(**item) for item in risks],
        structuredTables=[FinancialTable(**item) for item in structured_tables],
        notes=None if structured_tables else "Qualitative document - no summary metrics extracted.",
    )
