from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    id: str
    name: str
    email: EmailStr
    isAdmin: bool = False
    joinDate: Optional[datetime] = None
    sessionCount: int = 0
    lastActive: Optional[datetime] = None
    attributes: Optional[List[UserAttribute]] = None


class UserPublic(UserBase):
    pass


class UserInDB(UserBase):
    password: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserAttribute(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=500)


class UserAttributeUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: Optional[str] = Field(default=None, max_length=500)


class PasswordChangeRequest(BaseModel):
    currentPassword: str
    newPassword: str
