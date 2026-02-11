from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from azure.cosmos import exceptions as cosmos_exceptions  # type: ignore[import]

CosmosResourceNotFoundError = cosmos_exceptions.CosmosResourceNotFoundError

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.cosmos import get_container


class UsersRepository:
    def __init__(self) -> None:
        settings = get_settings()
        self.container = get_container(settings.users_container)

    def list_users(self) -> List[Dict[str, Any]]:
        return list(self.container.read_all_items())

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            return self.container.read_item(user_id, partition_key=user_id)
        except CosmosResourceNotFoundError:
            return None

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM c WHERE c.email = @email"
        items = list(
            self.container.query_items(
                query=query,
                parameters=[{"name": "@email", "value": email}],
                enable_cross_partition_query=True,
            )
        )
        return items[0] if items else None

    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        item = {
            "id": user_data["id"],
            "name": user_data["name"],
            "email": user_data["email"],
            "password": hash_password(user_data["password"]),
            "isAdmin": user_data.get("isAdmin", False),
            "joinDate": now,
            "sessionCount": 0,
            "lastActive": now,
        }
        self.container.create_item(item)
        return item

    def update_user_profile(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        user = self.get_by_id(user_id)
        if not user:
            return None
        user.update({k: v for k, v in updates.items() if v is not None})
        self.container.replace_item(user, user)
        return user

    def set_password(self, user_id: str, password: str) -> bool:
        user = self.get_by_id(user_id)
        if not user:
            return False
        user["password"] = hash_password(password)
        self.container.replace_item(user, user)
        return True

    def delete_user_attribute(self, user_id: str, name: str) -> Tuple[Optional[Dict[str, Any]], bool]:
        user = self.get_by_id(user_id)
        if not user:
            return None, False
        existing = user.get("attributes")
        if not isinstance(existing, list) or not existing:
            return user, False

        cleaned = [attr for attr in existing if not isinstance(attr, dict) or attr.get("name") != name]
        removed = len(cleaned) != len(existing)
        if not removed:
            return user, False

        user["attributes"] = cleaned
        self.container.replace_item(user, user)
        return user, True

    def add_user_attribute(self, user_id: str, attribute: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], bool]:
        user = self.get_by_id(user_id)
        if not user:
            return None, False

        existing = user.get("attributes")
        attributes = existing if isinstance(existing, list) else []

        name = attribute.get("name")
        if any(isinstance(attr, dict) and attr.get("name") == name for attr in attributes):
            return user, False

        attributes.append({"name": name, "description": attribute.get("description")})
        user["attributes"] = attributes
        self.container.replace_item(user, user)
        return user, True

    def update_user_attribute(
        self, user_id: str, name: str, updates: Dict[str, Any]
    ) -> Tuple[Optional[Dict[str, Any]], bool, bool]:
        user = self.get_by_id(user_id)
        if not user:
            return None, False, False

        existing = user.get("attributes")
        if not isinstance(existing, list) or not existing:
            return user, False, False

        index = next(
            (i for i, attr in enumerate(existing) if isinstance(attr, dict) and attr.get("name") == name),
            None,
        )
        if index is None:
            return user, False, False

        new_name = updates.get("name", name)
        if new_name != name and any(
            isinstance(attr, dict) and attr.get("name") == new_name for attr in existing
        ):
            return user, False, True

        updated = dict(existing[index])
        updated.update({k: v for k, v in updates.items() if v is not None})
        updated["name"] = new_name
        existing[index] = updated
        user["attributes"] = existing
        self.container.replace_item(user, user)
        return user, True, False

    def touch_last_active(self, user_id: str) -> None:
        user = self.get_by_id(user_id)
        if not user:
            return
        user["lastActive"] = datetime.now(timezone.utc).isoformat()
        self.container.replace_item(user, user)

    def increment_session_count(self, user_id: str) -> None:
        user = self.get_by_id(user_id)
        if not user:
            return
        user["sessionCount"] = int(user.get("sessionCount", 0)) + 1
        self.container.replace_item(user, user)


def get_users_repository() -> UsersRepository:
    return UsersRepository()
