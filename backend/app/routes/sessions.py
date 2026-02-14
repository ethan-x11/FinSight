from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import get_current_user
from app.repositories.sessions import SessionsRepository, get_sessions_repository
from app.repositories.users import UsersRepository, get_users_repository
from app.models.session import (
    AnalysisSession,
    ProcessingStatus,
    SessionCreate,
    RuleSet,
    RuleSetUpdate,
    SessionUpdate,
)
from app.models.user import UserInDB
from app.services.blob_service import BlobService
from app.services.search_service import SearchService
from app.services.ingestion_service import IngestionService

router = APIRouter(tags=["sessions"], dependencies=[Depends(get_current_user)])


@router.get("/session", response_model=list[AnalysisSession])
async def list_sessions(
    current_user: UserInDB = Depends(get_current_user),
    repo: SessionsRepository = Depends(get_sessions_repository),
    all: bool = Query(False, description="Admin only: fetch all sessions"),
) -> list[AnalysisSession]:
    if all and current_user.isAdmin:
        records = repo.list_sessions()
    else:
        records = repo.list_by_user(current_user.id)
    return [AnalysisSession.model_validate(rec) for rec in records]


@router.get("/session/{session_id}", response_model=AnalysisSession)
async def get_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user),
    repo: SessionsRepository = Depends(get_sessions_repository),
) -> AnalysisSession:
    record = repo.get_by_id(session_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not current_user.isAdmin and record["userId"] != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return AnalysisSession.model_validate(record)


@router.post("/session", response_model=AnalysisSession, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreate,
    current_user: UserInDB = Depends(get_current_user),
    repo: SessionsRepository = Depends(get_sessions_repository),
    users_repo: UsersRepository = Depends(get_users_repository),
) -> AnalysisSession:
    if not current_user.isAdmin and payload.userId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create sessions for other users")
    record = repo.create_session(payload.model_dump())
    users_repo.increment_session_count(payload.userId)
    return AnalysisSession.model_validate(record)


@router.patch("/session/{session_id}", response_model=AnalysisSession)
async def update_session(
    session_id: str,
    payload: SessionUpdate,
    current_user: UserInDB = Depends(get_current_user),
    repo: SessionsRepository = Depends(get_sessions_repository),
) -> AnalysisSession:
    record = repo.get_by_id(session_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not current_user.isAdmin and record["userId"] != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    updated = repo.upsert_session({**record, **payload.model_dump(exclude_unset=True)})
    return AnalysisSession.model_validate(updated)


@router.post("/session/{session_id}/ruleset", response_model=AnalysisSession, status_code=status.HTTP_201_CREATED)
async def create_session_ruleset(
    session_id: str,
    payload: RuleSet,
    current_user: UserInDB = Depends(get_current_user),
    repo: SessionsRepository = Depends(get_sessions_repository),
) -> AnalysisSession:
    record = repo.get_by_id(session_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not current_user.isAdmin and record["userId"] != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    updated, created = repo.add_session_ruleset(session_id, payload.model_dump())
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not created:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ruleset already exists")
    return AnalysisSession.model_validate(updated)


@router.patch("/session/{session_id}/ruleset/{name}", response_model=AnalysisSession)
async def update_session_ruleset(
    session_id: str,
    name: str,
    payload: RuleSetUpdate,
    current_user: UserInDB = Depends(get_current_user),
    repo: SessionsRepository = Depends(get_sessions_repository),
) -> AnalysisSession:
    record = repo.get_by_id(session_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not current_user.isAdmin and record["userId"] != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    updated, changed, conflict = repo.update_session_ruleset(
        session_id, name, payload.model_dump(exclude_unset=True)
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if conflict:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ruleset name already exists")
    if not changed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ruleset not found")
    return AnalysisSession.model_validate(updated)


@router.delete("/session/{session_id}/ruleset/{name}", response_model=AnalysisSession)
async def delete_session_ruleset(
    session_id: str,
    name: str,
    current_user: UserInDB = Depends(get_current_user),
    repo: SessionsRepository = Depends(get_sessions_repository),
) -> AnalysisSession:
    record = repo.get_by_id(session_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not current_user.isAdmin and record["userId"] != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    updated, removed = repo.delete_session_ruleset(session_id, name)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ruleset not found")
    return AnalysisSession.model_validate(updated)


@router.get("/session/{session_id}/status", response_model=ProcessingStatus)
async def get_session_status(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user),
    repo: SessionsRepository = Depends(get_sessions_repository),
) -> ProcessingStatus:
    record = repo.get_by_id(session_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not current_user.isAdmin and record["userId"] != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    status_payload = record.get("systemStatus") or {}
    return ProcessingStatus.model_validate(status_payload)


@router.delete("/session/{session_id}")
async def delete_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user),
    repo: SessionsRepository = Depends(get_sessions_repository),
):
    record = repo.get_by_id(session_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not current_user.isAdmin and record["userId"] != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    status_payload = record.get("systemStatus") or {}
    status_payload["overallStatus"] = "cancelling"
    status_payload["cancelRequested"] = True
    repo.update_status(session_id, status_payload)
    IngestionService.request_cancel(session_id)

    documents = record.get("sourceDocument") or []
    index_names = [doc.get("indexName") for doc in documents if doc.get("indexName")]
    blob_paths = [doc.get("blobPath") for doc in documents if doc.get("blobPath")]

    search_service = SearchService()
    blob_service = BlobService()

    deleted_indices = search_service.delete_indices(index_names)
    deleted_blobs = []
    for blob_path in blob_paths:
        blob_service.delete_blob(blob_path)
        deleted_blobs.append(blob_path)

    repo.delete_session(session_id, record["userId"])
    return {"message": "Session deleted", "deletedIndices": deleted_indices, "deletedBlobs": deleted_blobs}


