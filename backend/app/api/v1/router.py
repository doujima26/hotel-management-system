from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, bookings, dashboard, favorites, hotels, payments, reviews, rooms, staff, users

# Tao router goc cho API version v1.
api_router = APIRouter()

# Dang ky tat ca endpoint module vao router v1.
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(hotels.router)
api_router.include_router(rooms.router)
api_router.include_router(bookings.router)
api_router.include_router(payments.router)
api_router.include_router(staff.router)
api_router.include_router(reviews.router)
api_router.include_router(favorites.router)
api_router.include_router(admin.router)
api_router.include_router(dashboard.router)
