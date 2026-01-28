from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.repositories.feedback import FeedbackRepository, get_feedback_repository
from app.repositories.sessions import SessionsRepository, get_sessions_repository
from app.models.user import UserInDB

router = APIRouter(tags=["feedback"], dependencies=[Depends(get_current_user)])


@router.post("/feedback")
async def submit_feedback(
    sessionId: str,
    messageId: str,
    thumbRating: str,
    comment: str | None = None,
    current_user: UserInDB = Depends(get_current_user),
    sessions_repo: SessionsRepository = Depends(get_sessions_repository),
    feedback_repo: FeedbackRepository = Depends(get_feedback_repository),
):
    session = sessions_repo.get_by_id(sessionId)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not current_user.isAdmin and session["userId"] != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    history = session.get("chatHistory", [])
    updated = False
    for message in history:
        if message.get("messageId") == messageId:
            message["userFeedback"] = {
                "thumbRating": thumbRating,
                "comment": comment,
                "submittedAt": datetime.now(timezone.utc).isoformat(),
            }
            updated = True
            break
    if updated:
        session["chatHistory"] = history
        sessions_repo.upsert_session(session)

    feedback_repo.add_feedback(
        {
            "sessionId": sessionId,
            "messageId": messageId,
            "thumbRating": thumbRating,
            "comment": comment,
            "userId": current_user.id,
        }
    )
    return {"message": "Feedback recorded"}
