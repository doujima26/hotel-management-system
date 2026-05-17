from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get("")
def rooms_ping():
    return ok({"module": "rooms"}, "Rooms module ready")

