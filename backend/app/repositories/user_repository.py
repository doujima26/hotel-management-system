from sqlalchemy import func, or_
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


# Lay danh sach nguoi dung cho super admin quan ly, loc theo role/is_active/tu khoa
# (khong loc neu None). Tu khoa tim theo ten hoac email.
def list_user_records(
    db: Session,
    *,
    role_filter: UserRole | None,
    is_active_filter: bool | None,
    search: str | None = None,
    page: int,
    page_size: int,
) -> tuple[list[User], int]:
    query = db.query(User)
    if role_filter:
        query = query.filter(User.role == role_filter)
    if is_active_filter is not None:
        query = query.filter(User.is_active == is_active_filter)
    if search:
        keyword = f"%{search.strip()}%"
        query = query.filter(or_(User.full_name.ilike(keyword), User.email.ilike(keyword)))

    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return users, total


# Dem so tai khoan theo tung vai tro tren toan he thong.
def count_users_by_role(db: Session) -> dict[str, int]:
    rows = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    return {str(role): int(count) for role, count in rows}


# Luu thay doi thong tin nguoi dung.
def save_user(db: Session, user: User) -> User:
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
