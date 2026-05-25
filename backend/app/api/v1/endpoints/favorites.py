from fastapi import APIRouter

from app.core.response import ok

router = APIRouter(prefix="/favorites", tags=["favorites"])


# Endpoint tam de kiem tra module favorites.
@router.get("")
def favorites_ping():
    return ok({"module": "favorites"}, "Favorites module ready")
