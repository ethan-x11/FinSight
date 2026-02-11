from __future__ import annotations

from datetime import datetime, timezone
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.repositories.sessions import SessionsRepository, get_sessions_repository
from app.models.session import AnalysisOutput, KeyInsight, AttributeInsightRequest
from app.models.user import UserAttribute, UserInDB
from app.services.attribute_finder import AttributeFinder

router = APIRouter(tags=["insights"], dependencies=[Depends(get_current_user)])



@router.get("/insights/{session_id}", response_model=List[AnalysisOutput])
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
    
    if isinstance(analysis, dict):
        analysis = [analysis]
    # print("Analysis Output:", analysis)
    return [AnalysisOutput.model_validate(item) for item in analysis]


@router.post("/insights/{session_id}", response_model=List[AnalysisOutput])
async def generate_attribute_insight(
    session_id: str,
    payload: AttributeInsightRequest,
    current_user: UserInDB = Depends(get_current_user),
    sessions_repo: SessionsRepository = Depends(get_sessions_repository),
) -> List[AnalysisOutput]:
    session = sessions_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not current_user.isAdmin and session.get("userId") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    sources = session.get("sourceDocument") or []
    source = next((item for item in sources if item.get("fileName") == payload.fileName), None)
    if not source:
        raise HTTPException(status_code=404, detail="File not found in session")

    index_name = source.get("indexName")
    if not index_name:
        raise HTTPException(status_code=400, detail="Index name not available for this file")

    insight = AttributeFinder().find_attribute(
        name=payload.attribute.name,
        description=payload.attribute.description,
        index_name=index_name,
    )

    analysis = session.get("analysisOutput") or []
    if isinstance(analysis, dict):
        analysis = [analysis]

    file_output = next((item for item in analysis if item.get("fileName") == payload.fileName), None)
    is_new_output = False
    if not file_output:
        file_output = AnalysisOutput(fileName=payload.fileName).model_dump()
        analysis.append(file_output)
        is_new_output = True

    key_insights = file_output.get("keyInsights") or []
    key_insights.append(
        KeyInsight(
            id=uuid4().hex,
            name=insight.name,
            description=payload.attribute.description,
            value=insight.value,
            trend=insight.trend,
            citation=insight.citation,
        ).model_dump()
    )
    file_output["keyInsights"] = key_insights

    if is_new_output:
        sessions_repo.update_analysis(session_id, file_output)
    else:
        session["analysisOutput"] = analysis
        session["timestamp"] = datetime.now(timezone.utc).isoformat()
        sessions_repo.upsert_session(session)

    return [AnalysisOutput.model_validate(item) for item in analysis]


@router.delete("/insights/{session_id}/keyinsight/{insight_id}", response_model=List[AnalysisOutput])
async def delete_key_insight(
    session_id: str,
    insight_id: str,
    current_user: UserInDB = Depends(get_current_user),
    sessions_repo: SessionsRepository = Depends(get_sessions_repository),
) -> List[AnalysisOutput]:
    session = sessions_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not current_user.isAdmin and session.get("userId") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    analysis = session.get("analysisOutput") or []
    if isinstance(analysis, dict):
        analysis = [analysis]

    removed = False
    for output in analysis:
        key_insights = output.get("keyInsights") or []
        filtered = [item for item in key_insights if item.get("id") != insight_id]
        if len(filtered) != len(key_insights):
            output["keyInsights"] = filtered
            removed = True

    if not removed:
        raise HTTPException(status_code=404, detail="Insight not found")

    session["analysisOutput"] = analysis
    session["timestamp"] = datetime.now(timezone.utc).isoformat()
    sessions_repo.upsert_session(session)

    return [AnalysisOutput.model_validate(item) for item in analysis]