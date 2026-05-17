from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/hotels", tags=["hotels"])


@router.get("")
def hotels_ping():
    return ok({"module": "hotels"}, "Hotels module ready")

