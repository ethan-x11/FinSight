from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserPublic


class Token(BaseModel):
    accessToken: str
    tokenType: str = Field(default="bearer")
    expiresAt: datetime


class LoginRequest(BaseModel):
    userId: str
    password: str


class SignupRequest(BaseModel):
    userId: str
    name: str
    email: EmailStr
    password: str


class AuthenticatedResponse(BaseModel):
    token: Token
    user: UserPublic


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    temporaryPassword: Optional[str] = None
