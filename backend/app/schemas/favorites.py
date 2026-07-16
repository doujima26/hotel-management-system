from datetime import datetime

from pydantic import BaseModel


# Schema du lieu tra ve 1 khach san yeu thich.
class FavoriteResponse(BaseModel):
    id: int
    hotel_id: int
    hotel_name: str
    city: str
    created_at: datetime
