from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.enums import UserRole
from app.core.security import decode_token
from app.db.session import get_db
from app.models.entities import User
from app.repositories.user_repository import get_user_by_id

# Khoi tao co che Bearer token cho endpoint bao mat.
bearer_scheme = HTTPBearer(auto_error=True)


# Lay nguoi dung hien tai tu access token.
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ",
        ) from exc
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ",
        )

    user_id = payload.get("sub")
    if not user_id or not str(user_id).isdigit():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ",
        )

    user = get_user_by_id(db, int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Người dùng không tồn tại",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa",
        )
    # Token cap truoc lan doi mat khau gan nhat (lech "ver") bi tu choi - dam bao
    # doi mat khau thu hoi phien tren MOI thiet bi ngay lap tuc.
    if payload.get("ver") != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã hết hiệu lực, vui lòng đăng nhập lại",
        )
    return user


# Tao dependency kiem tra quyen theo role.
def require_roles(*roles: UserRole):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        allowed = {role.value for role in roles}
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền truy cập",
            )
        return current_user

    return checker
