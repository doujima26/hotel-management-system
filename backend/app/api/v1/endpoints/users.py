from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
def users_ping():
    return ok({"module": "users"}, "Users module ready")

