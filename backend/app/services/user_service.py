from sqlalchemy.orm import Session

from app.models.entities import User
from app.repositories.user_repository import save_user
from app.schemas.auth import UserPublicResponse
from app.schemas.users import UpdateUserRequest


# Xu ly nguoi dung tu cap nhat ho so cua minh (full_name/phone/avatar_url).
def update_my_profile(db: Session, current_user: User, payload: UpdateUserRequest) -> dict:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    user = save_user(db, current_user)
    return UserPublicResponse.model_validate(user).model_dump(mode="json")
