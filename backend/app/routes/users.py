from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_admin, get_current_user
from app.repositories.users import UsersRepository, get_users_repository
from app.models.user import PasswordChangeRequest, UserInDB, UserPublic, UserUpdate
from app.core.security import verify_password

router = APIRouter(tags=["users"], dependencies=[Depends(get_current_user)])


@router.get("/user", response_model=list[UserPublic])
async def list_users(
    _: UserInDB = Depends(get_current_admin), repo: UsersRepository = Depends(get_users_repository)
) -> list[UserPublic]:
    return [UserPublic.model_validate(item) for item in repo.list_users()]


@router.get("/user/me", response_model=UserPublic)
async def get_me(current_user: UserInDB = Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(current_user.model_dump())


@router.patch("/user/me", response_model=UserPublic)
async def update_profile(
    updates: UserUpdate, current_user: UserInDB = Depends(get_current_user), repo: UsersRepository = Depends(get_users_repository)
) -> UserPublic:
    record = repo.update_user_profile(current_user.id, updates.dict(exclude_unset=True))
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserPublic.model_validate(record)


@router.post("/user/me/password")
async def change_password(
    request: PasswordChangeRequest,
    current_user: UserInDB = Depends(get_current_user),
    repo: UsersRepository = Depends(get_users_repository),
):
    if request.currentPassword == request.newPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        )
    stored = repo.get_by_id(current_user.id)
    if not stored or not verify_password(request.currentPassword, stored["password"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Incorrect password")
    repo.set_password(current_user.id, request.newPassword)
    return {"message": "Password updated successfully"}
