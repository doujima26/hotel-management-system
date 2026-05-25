from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/admin", tags=["admin"])


# Endpoint tam de kiem tra module admin.
@router.get("")
def admin_ping():
    return ok({"module": "admin"}, "Admin module ready")
