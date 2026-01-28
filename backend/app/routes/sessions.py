from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import get_current_user
from app.repositories.sessions import SessionsRepository, get_sessions_repository
from app.repositories.users import UsersRepository, get_users_repository
from app.models.session import AnalysisSession, SessionCreate, SessionUpdate
from app.models.user import UserInDB

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
    updated = repo.upsert_session({**record, **payload.dict(exclude_unset=True)})
    return AnalysisSession.model_validate(updated)
