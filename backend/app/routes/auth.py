from __future__ import annotations

from datetime import datetime, timedelta, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import get_settings
from app.core.security import create_access_token, verify_password
from app.repositories.users import UsersRepository, get_users_repository
from app.models.auth import (
    AuthenticatedResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    SignupRequest,
    Token,
)
from app.models.user import UserPublic

router = APIRouter(tags=["auth"])


def _build_token(user_id: str) -> Token:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    token = create_access_token(subject=user_id)
    return Token(accessToken=token, expiresAt=expires_at)


@router.post("/auth/login", response_model=AuthenticatedResponse)
async def login(payload: LoginRequest, repo: UsersRepository = Depends(get_users_repository)) -> AuthenticatedResponse:
    user = repo.get_by_id(payload.userId)
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    repo.touch_last_active(user["id"])
    token = _build_token(user["id"])
    return AuthenticatedResponse(token=token, user=UserPublic.model_validate(user))


@router.post("/auth/signup", response_model=AuthenticatedResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, repo: UsersRepository = Depends(get_users_repository)) -> AuthenticatedResponse:
    if repo.get_by_id(payload.userId):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User ID already exists")
    if repo.get_by_email(payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    user = repo.create_user(
        {"id": payload.userId, "name": payload.name, "email": payload.email, "password": payload.password}
    )
    token = _build_token(user["id"])
    return AuthenticatedResponse(token=token, user=UserPublic.model_validate(user))


@router.post("/auth/forgotpassword", response_model=ForgotPasswordResponse)
async def forgot_password(
    payload: ForgotPasswordRequest, repo: UsersRepository = Depends(get_users_repository)
) -> ForgotPasswordResponse:
    user = repo.get_by_email(payload.email)
    if not user:
        return ForgotPasswordResponse(
            message="If an account exists for the provided email, a reset token was generated."
        )
    temporary_password = secrets.token_urlsafe(8)
    repo.set_password(user["id"], temporary_password)
    return ForgotPasswordResponse(
        message="Temporary password generated. Please update your password after login.",
        temporaryPassword=temporary_password,
    )
