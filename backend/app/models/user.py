from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.session import Attribute, RuleSet


class UserBase(BaseModel):
    id: str
    name: str
    email: EmailStr
    isAdmin: bool = False
    joinDate: Optional[datetime] = None
    sessionCount: int = 0
    lastActive: Optional[datetime] = None
    attributes: Optional[List[Attribute]] = None
    ruleSets: Optional[List[RuleSet]] = None


class UserPublic(UserBase):
    pass


class UserInDB(UserBase):
    password: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordChangeRequest(BaseModel):
    currentPassword: str
    newPassword: str
