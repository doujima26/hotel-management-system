from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/users", tags=["users"])


# Endpoint tam de kiem tra module users.
@router.get("")
def users_ping():
    return ok({"module": "users"}, "Users module ready")
