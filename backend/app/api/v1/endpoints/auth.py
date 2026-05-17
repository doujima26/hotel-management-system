from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("")
def auth_ping():
    return ok({"module": "auth"}, "Auth module ready")

