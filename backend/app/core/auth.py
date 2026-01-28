from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import get_settings
from app.core.security import decode_token
from app.repositories.users import UsersRepository, get_users_repository
from app.models.user import UserInDB


def get_oauth_scheme() -> OAuth2PasswordBearer:
    settings = get_settings()
    return OAuth2PasswordBearer(tokenUrl=f"{settings.api_prefix}/auth/login")


oauth2_scheme = get_oauth_scheme()


def _credentials_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    repo: UsersRepository = Depends(get_users_repository),
) -> UserInDB:
    try:
        payload = decode_token(token)
    except ValueError as exc:  # pragma: no cover
        raise _credentials_error() from exc

    user_id: str | None = payload.get("sub")  # type: ignore[assignment]
    if not user_id:
        raise _credentials_error()

    user_record = repo.get_by_id(user_id)
    if not user_record:
        raise _credentials_error()

    return UserInDB.model_validate(user_record)


async def get_current_admin(
    current_user: UserInDB = Depends(get_current_user),
) -> UserInDB:
    if not current_user.isAdmin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
    return current_user
