from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("")
def reviews_ping():
    return ok({"module": "reviews"}, "Reviews module ready")

