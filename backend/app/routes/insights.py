from __future__ import annotations

from datetime import datetime, timezone
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.repositories.sessions import SessionsRepository, get_sessions_repository
from app.models.session import (
    AnalysisOutput,
    AttributeInsightRequest,
    KeyInsight,
    KeyInsightUpdate,
    RuleSet,
)
from app.models.user import UserInDB
from app.services.attribute_finder import AttributeFinder
from app.services.ruleset_generator import RuleSetGenerator

router = APIRouter(tags=["insights"], dependencies=[Depends(get_current_user)])


@router.get("/insight/{session_id}", response_model=List[AnalysisOutput])
async def get_insights(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user),
    sessions_repo: SessionsRepository = Depends(get_sessions_repository),
) -> List[AnalysisOutput]:
    session = sessions_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not current_user.isAdmin and session.get("userId") != current_user.id:
        raise HTTPException(status_code=403, detail="Not Authorized")

    analysis = session.get("analysisOutput") or []

    if isinstance(analysis, dict):
        analysis = [analysis]
    # print("Analysis Output:", analysis)
    return [AnalysisOutput.model_validate(item) for item in analysis]


@router.post("/insight/{session_id}/keyinsight", response_model=List[AnalysisOutput])
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
        raise HTTPException(status_code=403, detail="Not Authorized")

    sources = session.get("sourceDocument") or []
    source = next(
        (item for item in sources if item.get("fileName") == payload.fileName), None
    )
    if not source:
        raise HTTPException(status_code=404, detail="File not found in session")

    index_name = source.get("indexName")
    if not index_name:
        raise HTTPException(
            status_code=400, detail="Index name not available for this file"
        )

    insight = AttributeFinder().find_attribute(
        name=payload.attribute.name,
        description=payload.attribute.description,
        index_name=index_name,
        rule_sets=[
            RuleSet.model_validate(ruleSet) for ruleSet in session.get("ruleSets", [])
        ],
    )

    analysis = session.get("analysisOutput") or []
    if isinstance(analysis, dict):
        analysis = [analysis]

    file_output = next(
        (item for item in analysis if item.get("fileName") == payload.fileName), None
    )
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


@router.delete(
    "/insight/{session_id}/keyinsight/{keyinsight_id}",
    response_model=List[AnalysisOutput],
)
async def delete_key_insight(
    session_id: str,
    keyinsight_id: str,
    current_user: UserInDB = Depends(get_current_user),
    sessions_repo: SessionsRepository = Depends(get_sessions_repository),
) -> List[AnalysisOutput]:
    session = sessions_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not current_user.isAdmin and session.get("userId") != current_user.id:
        raise HTTPException(status_code=403, detail="Not Authorized")

    analysis = session.get("analysisOutput") or []
    if isinstance(analysis, dict):
        analysis = [analysis]

    removed = False
    for output in analysis:
        key_insights = output.get("keyInsights") or []
        filtered = [item for item in key_insights if item.get("id") != keyinsight_id]
        if len(filtered) != len(key_insights):
            output["keyInsights"] = filtered
            removed = True

    if not removed:
        raise HTTPException(status_code=404, detail="Insight not found")

    session["analysisOutput"] = analysis
    session["timestamp"] = datetime.now(timezone.utc).isoformat()
    sessions_repo.upsert_session(session)

    return [AnalysisOutput.model_validate(item) for item in analysis]


@router.patch(
    "/insight/{session_id}/keyinsight/{keyinsight_id}",
    response_model=List[AnalysisOutput],
)
async def update_key_insight(
    session_id: str,
    keyinsight_id: str,
    payload: KeyInsightUpdate,
    current_user: UserInDB = Depends(get_current_user),
    sessions_repo: SessionsRepository = Depends(get_sessions_repository),
) -> List[AnalysisOutput]:
    session = sessions_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not current_user.isAdmin and session.get("userId") != current_user.id:
        raise HTTPException(status_code=403, detail="Not Authorized")

    analysis = session.get("analysisOutput") or []
    if isinstance(analysis, dict):
        analysis = [analysis]

    found_insight = None
    for output in analysis:
        key_insights = output.get("keyInsights") or []
        for insight in key_insights:
            if insight.get("id") == keyinsight_id:
                found_insight = insight
                break
        if found_insight is not None:
            break

    if found_insight is None:
        raise HTTPException(status_code=404, detail="Insight not found")

    altered_fields: List[dict] = []
    if payload.value is not None and payload.value != found_insight.get("value"):
        altered_fields.append(
            {"field": "value", "oldValue": found_insight.get("value")}
        )
        found_insight["value"] = payload.value
    if payload.trend is not None and payload.trend != found_insight.get("trend"):
        altered_fields.append(
            {"field": "trend", "oldValue": found_insight.get("trend")}
        )
        found_insight["trend"] = payload.trend

    if not altered_fields:
        raise HTTPException(status_code=400, detail="No changes to update")

    found_insight["altered"] = True
    existing_fields = found_insight.get("alteredFields") or []
    merged = {
        item.get("field"): item
        for item in existing_fields
        if isinstance(item, dict) and item.get("field")
    }
    for item in altered_fields:
        merged[item["field"]] = item
    found_insight["alteredFields"] = list(merged.values())
    found_insight["alterationReasoning"] = payload.alterationReasoning

    for output in analysis:
        key_insights = output.get("keyInsights") or []
        for index, insight in enumerate(key_insights):
            if insight.get("id") == keyinsight_id:
                key_insights[index] = found_insight
                output["keyInsights"] = key_insights
                break

    session["analysisOutput"] = analysis
    session["timestamp"] = datetime.now(timezone.utc).isoformat()
    sessions_repo.upsert_session(session)

    if payload.triggerAutoRuleSet:
        ruleset_generator = RuleSetGenerator()
        data = KeyInsight.model_validate(found_insight)
        original_data = data.model_dump(
            include={"name", "description", "value", "trend", "citation"}
        )
        altered_data = data.model_dump(include={"alteredFields", "alterationReasoning"})
        generated_ruleset = ruleset_generator.generate_rule_set(
            original_data=original_data,
            altered_data=altered_data,
            rule_sets=[
                RuleSet.model_validate(ruleSet)
                for ruleSet in session.get("ruleSets", [])
            ],
        )
        if generated_ruleset.name and generated_ruleset.description:
            rule_sets = session.get("ruleSets") or []
            rule_sets.append(generated_ruleset.model_dump())
            sessions_repo.add_session_ruleset(session_id, generated_ruleset.model_dump())

    return [AnalysisOutput.model_validate(item) for item in analysis]
