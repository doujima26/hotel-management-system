from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("")
def staff_ping():
    return ok({"module": "staff"}, "Staff module ready")

