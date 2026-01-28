from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import uuid4

from app.core.config import get_settings
from app.db.cosmos import get_container


class FeedbackRepository:
    def __init__(self) -> None:
        settings = get_settings()
        self.container = get_container(settings.feedback_container)

    def add_feedback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        item = {
            "id": uuid4().hex,
            "sessionId": payload["sessionId"],
            "messageId": payload.get("messageId"),
            "userId": payload.get("userId"),
            "thumbRating": payload.get("thumbRating"),
            "comment": payload.get("comment"),
            "submittedAt": datetime.now(timezone.utc).isoformat(),
        }
        self.container.create_item(item)
        return item

    def list_for_session(self, session_id: str) -> List[Dict[str, Any]]:
        query = "SELECT * FROM c WHERE c.sessionId = @sid ORDER BY c.submittedAt DESC"
        return list(
            self.container.query_items(
                query=query,
                parameters=[{"name": "@sid", "value": session_id}],
                enable_cross_partition_query=True,
            )
        )


def get_feedback_repository() -> FeedbackRepository:
    return FeedbackRepository()
