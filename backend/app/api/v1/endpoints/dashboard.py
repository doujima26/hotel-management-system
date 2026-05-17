from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def dashboard_ping():
    return ok({"module": "dashboard"}, "Dashboard module ready")

