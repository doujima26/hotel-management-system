from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/bookings", tags=["bookings"])


# Endpoint tam de kiem tra module bookings.
@router.get("")
def bookings_ping():
    return ok({"module": "bookings"}, "Bookings module ready")
