from datetime import datetime

from pydantic import BaseModel, Field


# Schema du lieu dau vao cho tao danh gia.
class CreateReviewRequest(BaseModel):
    booking_id: int = Field(gt=0)
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


# Schema du lieu tra ve 1 danh gia, kem ten nguoi danh gia.
class ReviewResponse(BaseModel):
    id: int
    user_id: int
    reviewer_name: str
    hotel_id: int
    booking_id: int
    rating: int
    comment: str | None = None
    created_at: datetime
