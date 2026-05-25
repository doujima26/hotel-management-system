from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/payments", tags=["payments"])


# Endpoint tam de kiem tra module payments.
@router.get("")
def payments_ping():
    return ok({"module": "payments"}, "Payments module ready")
