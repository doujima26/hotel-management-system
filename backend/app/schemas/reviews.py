from datetime import date, datetime

from pydantic import BaseModel, Field


# Schema du lieu dau vao cho tao danh gia. Diem theo thang 10 - dung 1 thang duy
# nhat cho ca he thong (truoc day luu 1-5 sao roi nhan 2 khi hien thi).
class CreateReviewRequest(BaseModel):
    booking_id: int = Field(gt=0)
    rating: int = Field(ge=1, le=10)
    comment: str | None = None


# Schema du lieu dau vao cho sua danh gia (tat ca field tuy chon).
class UpdateReviewRequest(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=10)
    comment: str | None = None


# Schema du lieu tra ve sau khi xoa danh gia.
class DeleteReviewResponse(BaseModel):
    id: int


# Schema du lieu tra ve 1 danh gia. Kem thong tin lan luu tru da danh gia (ma
# don, ngay nhan/tra phong, ten cac loai phong da o) de nguoi doc biet danh gia
# noi ve don nao chu khong chi thay ten va so sao.
class ReviewResponse(BaseModel):
    id: int
    user_id: int
    reviewer_name: str
    hotel_id: int
    booking_id: int
    booking_code: str
    check_in_date: date
    check_out_date: date
    room_type_names: list[str] = []
    rating: int
    comment: str | None = None
    created_at: datetime
