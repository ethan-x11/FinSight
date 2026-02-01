from __future__ import annotations

from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.repositories.sessions import SessionsRepository, get_sessions_repository
from app.models.session import AnalysisOutput, KeyInsight, RiskFactor
from app.models.user import UserInDB

router = APIRouter(tags=["insights"], dependencies=[Depends(get_current_user)])


@router.get("/insights/{session_id}", response_model=AnalysisOutput)
async def get_insights(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user),
    sessions_repo: SessionsRepository = Depends(get_sessions_repository),
) -> List[AnalysisOutput]:
    session = sessions_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not current_user.isAdmin and session.get("userId") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    analysis = session.get("analysisOutput") or []
    print("Analysis Output:", analysis)
    return [AnalysisOutput.model_validate(item) for item in analysis]