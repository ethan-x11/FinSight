from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.core.config import get_settings
from app.db.cosmos import get_container


class SessionsRepository:
    def __init__(self) -> None:
        settings = get_settings()
        self.container = get_container(settings.sessions_container)

    def create_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        item = {
            "id": session_data.get("id") or uuid4().hex,
            "userId": session_data["userId"],
            "type": session_data.get("type", "analysis_session"),
            "version": session_data.get("version", "1.0"),
            "metadata": session_data["metadata"],
            "sourceDocument": session_data["sourceDocument"],
            "systemStatus": session_data.get("systemStatus")
            or {
                "overallStatus": "pending",
                "steps": {
                    "docIntelligenceTriggered": False,
                    "dataExtracted": False,
                    "chunksGenerated": False,
                    "embeddingsGenerated": False,
                    "searchIndexed": False,
                },
            },
            "analysisOutput": session_data.get("analysisOutput"),
            "chatHistory": session_data.get("chatHistory", []),
            "timestamp": session_data.get("timestamp", now),
        }
        self.container.create_item(item)
        return item

    def upsert_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        session_data.setdefault("id", uuid4().hex)
        session_data.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
        self.container.upsert_item(session_data)
        return session_data

    def get_by_id(self, session_id: str) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM c WHERE c.id = @id"
        items = list(
            self.container.query_items(
                query=query,
                parameters=[{"name": "@id", "value": session_id}],
                enable_cross_partition_query=True,
            )
        )
        return items[0] if items else None

    def list_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        query = "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.timestamp DESC"
        return list(
            self.container.query_items(
                query=query,
                parameters=[{"name": "@userId", "value": user_id}],
                enable_cross_partition_query=True,
            )
        )

    def list_sessions(self) -> List[Dict[str, Any]]:
        return list(self.container.read_all_items())

    def append_chat_message(self, session_id: str, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        session = self.get_by_id(session_id)
        if not session:
            return None
        history = session.get("chatHistory", [])
        history.append(message)
        session["chatHistory"] = history
        session["timestamp"] = datetime.now(timezone.utc).isoformat()
        self.container.upsert_item(session)
        return session

    def update_status(self, session_id: str, status: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        session = self.get_by_id(session_id)
        if not session:
            return None
        session["systemStatus"] = status
        session["timestamp"] = datetime.now(timezone.utc).isoformat()
        self.container.upsert_item(session)
        return session

    def update_analysis(self, session_id: str, analysis_output: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        session = self.get_by_id(session_id)
        if not session:
            return None
        session["analysisOutput"] = analysis_output
        session["timestamp"] = datetime.now(timezone.utc).isoformat()
        self.container.upsert_item(session)
        return session


def get_sessions_repository() -> SessionsRepository:
    return SessionsRepository()
