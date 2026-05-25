from sqlalchemy.orm import Session

from app.models.entities import User


# Tim user theo email.
def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


# Tim user theo id.
def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


# Tao user moi va luu vao CSDL.
def create_user(
    db: Session,
    *,
    email: str,
    password_hash: str,
    full_name: str,
    phone: str | None,
    role: str,
    is_active: bool = True,
    is_verified: bool = False,
) -> User:
    user = User(
        email=email,
        password_hash=password_hash,
        full_name=full_name,
        phone=phone,
        role=role,
        is_active=is_active,
        is_verified=is_verified,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
