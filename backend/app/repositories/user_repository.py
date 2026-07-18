from sqlalchemy.orm import Session

from app.core.enums import UserRole
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


# Lay danh sach nguoi dung cho super admin quan ly, loc theo role/is_active (khong loc neu None).
def list_user_records(
    db: Session,
    *,
    role_filter: UserRole | None,
    is_active_filter: bool | None,
    page: int,
    page_size: int,
) -> tuple[list[User], int]:
    query = db.query(User)
    if role_filter:
        query = query.filter(User.role == role_filter)
    if is_active_filter is not None:
        query = query.filter(User.is_active == is_active_filter)

    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return users, total


# Luu thay doi thong tin nguoi dung.
def save_user(db: Session, user: User) -> User:
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
