from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/rooms", tags=["rooms"])


# Endpoint tam de kiem tra module rooms.
@router.get("")
def rooms_ping():
    return ok({"module": "rooms"}, "Rooms module ready")
