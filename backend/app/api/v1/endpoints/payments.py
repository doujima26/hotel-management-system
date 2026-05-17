from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("")
def payments_ping():
    return ok({"module": "payments"}, "Payments module ready")

