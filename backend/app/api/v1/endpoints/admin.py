from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("")
def admin_ping():
    return ok({"module": "admin"}, "Admin module ready")

