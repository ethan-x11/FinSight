from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from azure.cosmos import exceptions as cosmos_exceptions  # type: ignore[import]

CosmosResourceNotFoundError = cosmos_exceptions.CosmosResourceNotFoundError

from app.core.config import get_settings
from app.db.cosmos import get_container


class SessionsRepository:
    def __init__(self) -> None:
        settings = get_settings()
        self.container = get_container(settings.sessions_container)

    @staticmethod
    def _normalize_datetimes(payload: Any) -> Any:
        """Recursively convert datetime objects to ISO strings for Cosmos DB storage."""
        if isinstance(payload, datetime):
            return payload.isoformat()
        if isinstance(payload, list):
            return [SessionsRepository._normalize_datetimes(item) for item in payload]
        if isinstance(payload, dict):
            return {key: SessionsRepository._normalize_datetimes(value) for key, value in payload.items()}
        return payload

    def create_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        item = {
            "id": session_data.get("id") or uuid4().hex,
            "userId": session_data["userId"],
            "type": session_data.get("type", "analysis_session"),
            "version": session_data.get("version", "1.0"),
            "metadata": session_data["metadata"],
            "conversationId": session_data.get("conversationId"),
            "ruleSets": session_data.get("ruleSets"),
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
        normalized = self._normalize_datetimes(item)
        self.container.create_item(normalized)
        return normalized

    def upsert_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        session_data.setdefault("id", uuid4().hex)
        session_data.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
        normalized = self._normalize_datetimes(session_data)
        self.container.upsert_item(normalized)
        return normalized

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

    def delete_session(self, session_id: str, user_id: str) -> bool:
        try:
            self.container.delete_item(session_id, partition_key=user_id)
            return True
        except CosmosResourceNotFoundError:
            return False

    def append_chat_message(self, session_id: str, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        session = self.get_by_id(session_id)
        if not session:
            return None
        history = session.get("chatHistory", [])
        history.append(message)
        session["chatHistory"] = history
        session["timestamp"] = datetime.now(timezone.utc).isoformat()
        normalized = self._normalize_datetimes(session)
        self.container.upsert_item(normalized)
        return normalized

    def update_status(self, session_id: str, status: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        session = self.get_by_id(session_id)
        if not session:
            return None
        session["systemStatus"] = status
        session["timestamp"] = datetime.now(timezone.utc).isoformat()
        normalized = self._normalize_datetimes(session)
        self.container.upsert_item(normalized)
        return normalized

    def update_analysis(self, session_id: str, analysis_output: Any) -> Optional[Dict[str, Any]]:
        session = self.get_by_id(session_id)
        if not session:
            return None
        existing = session.get("analysisOutput") or []
        if isinstance(existing, dict):
            existing = [existing]

        incoming = analysis_output
        if incoming is None:
            incoming_items = []
        elif isinstance(incoming, list):
            incoming_items = incoming
        else:
            incoming_items = [incoming]

        session["analysisOutput"] = existing + incoming_items
        session["timestamp"] = datetime.now(timezone.utc).isoformat()
        normalized = self._normalize_datetimes(session)
        self.container.upsert_item(normalized)
        return normalized

    def delete_session_ruleset(self, session_id: str, name: str) -> Tuple[Optional[Dict[str, Any]], bool]:
        session = self.get_by_id(session_id)
        if not session:
            return None, False

        existing = session.get("ruleSets")
        if not isinstance(existing, list) or not existing:
            return session, False

        cleaned = [ruleset for ruleset in existing if not isinstance(ruleset, dict) or ruleset.get("name") != name]
        removed = len(cleaned) != len(existing)
        if not removed:
            return session, False

        session["ruleSets"] = cleaned
        session["timestamp"] = datetime.now(timezone.utc).isoformat()
        normalized = self._normalize_datetimes(session)
        self.container.upsert_item(normalized)
        return normalized, True

    def add_session_ruleset(self, session_id: str, ruleset: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], bool]:
        session = self.get_by_id(session_id)
        if not session:
            return None, False

        existing = session.get("ruleSets")
        rulesets = existing if isinstance(existing, list) else []

        name = ruleset.get("name")
        if any(isinstance(item, dict) and item.get("name") == name for item in rulesets):
            return session, False

        rulesets.append(
            {
                "name": name,
                "description": ruleset.get("description")
            }
        )
        session["ruleSets"] = rulesets
        session["timestamp"] = datetime.now(timezone.utc).isoformat()
        normalized = self._normalize_datetimes(session)
        self.container.upsert_item(normalized)
        return normalized, True

    def update_session_ruleset(
        self, session_id: str, name: str, updates: Dict[str, Any]
    ) -> Tuple[Optional[Dict[str, Any]], bool, bool]:
        session = self.get_by_id(session_id)
        if not session:
            return None, False, False

        existing = session.get("ruleSets")
        if not isinstance(existing, list) or not existing:
            return session, False, False

        index = next(
            (i for i, ruleset in enumerate(existing) if isinstance(ruleset, dict) and ruleset.get("name") == name),
            None,
        )
        if index is None:
            return session, False, False

        new_name = updates.get("name", name)
        if new_name != name and any(
            isinstance(ruleset, dict) and ruleset.get("name") == new_name for ruleset in existing
        ):
            return session, False, True

        updated = dict(existing[index])
        updated.update({k: v for k, v in updates.items() if v is not None})
        updated["name"] = new_name
        existing[index] = updated
        session["ruleSets"] = existing
        session["timestamp"] = datetime.now(timezone.utc).isoformat()
        normalized = self._normalize_datetimes(session)
        self.container.upsert_item(normalized)
        return normalized, True, False

    def append_source_document(self, session_id: str, source_document: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        session = self.get_by_id(session_id)
        if not session:
            return None
        sources = session.get("sourceDocument", [])
        sources.extend(source_document)
        session["sourceDocument"] = sources
        session["timestamp"] = datetime.now(timezone.utc).isoformat()
        normalized = self._normalize_datetimes(session)
        self.container.upsert_item(normalized)
        return normalized
    
    def update_document_index(self, session_id: str, fileName: str, index_name: str) -> Optional[Dict[str, Any]]:
        session = self.get_by_id(session_id)
        # print("Updating document index for session:", session_id, " fileName:", fileName, " index_name:", index_name)
        if not session:
            # print("Session not found for session_id:", session_id)
            return None
        sources = session.get("sourceDocument", [])
        if not sources:
            # print("No source documents found in session:", session_id)
            return None
        for source in sources:
            if source.get("fileName") == fileName:
                # print("Updating indexName for file:", fileName)
                source["indexName"] = index_name
                break
        session["sourceDocument"] = sources
        session["timestamp"] = datetime.now(timezone.utc).isoformat()
        # with open("debug_session_update.json", "w") as f:
        #     import json
        #     json.dump(session, f, indent=2)
        normalized = self._normalize_datetimes(session)
        self.container.upsert_item(normalized)
        return normalized
    
    def get_document_data(self, session_id: str) -> List[Dict[str, Any]]:
        session = self.get_by_id(session_id)
        if not session:
            return []
        return session.get("sourceDocument", [])


def get_sessions_repository() -> SessionsRepository:
    return SessionsRepository()
