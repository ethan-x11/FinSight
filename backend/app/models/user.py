from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    id: str
    name: str
    email: EmailStr
    isAdmin: bool = False
    joinDate: Optional[datetime] = None
    sessionCount: int = 0
    lastActive: Optional[datetime] = None


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
