from __future__ import annotations

from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.repositories.sessions import SessionsRepository, get_sessions_repository
from app.models.session import AskRequest, AskResponse, QueryPlannerResponse
from app.models.user import UserInDB
from app.services.chat_service import ChatService
from app.services.search_service import SearchService
from app.services.query_planner import QueryPlanner

router = APIRouter(tags=["chat"], dependencies=[Depends(get_current_user)])


@router.post("/session/{session_id}/chat", response_model=AskResponse)
async def chat_flow(
    session_id: str,
    payload: AskRequest,
    current_user: UserInDB = Depends(get_current_user),
    sessions_repo: SessionsRepository = Depends(get_sessions_repository),
) -> AskResponse:
    session = sessions_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not current_user.isAdmin and session["userId"] != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    search_service = SearchService()
    chat_service = ChatService()
    query_planner = QueryPlanner()
    query_plan = QueryPlannerResponse(queries=[])

    if payload.use_query_planner:
        query_plan = query_planner.plan_query(payload.question)

    queries = [payload.question]
    if payload.use_query_planner:
        queries.extend([queryObj.query for queryObj in query_plan.queries])

    results: List[Dict[str, Any]] = []
    max_workers = min(8, max(1, len(queries)))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(search_service.search, session_id, q, payload.top_k) for q in queries]
        for future in as_completed(futures):
            results.extend(future.result())
    
    # Remove duplicates while preserving order
    seen = set()
    deduped_results = []
    for item in results:
        key = tuple(sorted(item.items()))
        if key in seen:
            continue
        seen.add(key)
        deduped_results.append(item)
    results = deduped_results

    answer_payload = chat_service.generate_answer(
        payload.question,
        results,
        history=session.get("chatHistory", []),
    )

    message = {
        "messageId": uuid4().hex,
        "role": "user",
        "content": payload.question,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    sessions_repo.append_chat_message(session_id, message)

    assistant_message = {
        "messageId": uuid4().hex,
        "role": "assistant",
        "content": answer_payload["answer"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "queryPlan": [q.model_dump() for q in query_plan.queries],
        "citations": answer_payload.get("citations"),
        "linkedCitations": answer_payload.get("linkedCitations", []),
    }
    sessions_repo.append_chat_message(session_id, assistant_message)

    return AskResponse(
        messageId=assistant_message["messageId"],
        answer=assistant_message["content"],
        queryPlan=assistant_message["queryPlan"],
        citations=assistant_message["citations"],
        linkedCitations=assistant_message["linkedCitations"],
    )