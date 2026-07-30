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


# Schema phan bo danh gia cua 1 loai phong. So luot (total_reviews) co the lon
# hon so danh gia thuc cua khach san: danh gia gan voi don, don co nhieu loai
# phong thi tinh cho tat ca loai phong trong don.
class RoomTypeReviewBreakdownItem(BaseModel):
    room_type_id: int
    name: str
    total_reviews: int
    avg_rating: float
    high_count: int
    medium_count: int
    low_count: int


# Schema phan bo danh gia theo loai phong cua 1 khach san, sap theo diem trung
# binh giam dan (loai phong duoc danh gia cao nhat len dau).
#
# unattributed_reviews la so danh gia khong quy duoc ve loai phong nao - phai tra
# ve de giao dien noi ro, tranh viec bieu do am tham bo qua mot phan du lieu.
class RoomTypeReviewBreakdownResponse(BaseModel):
    hotel_id: int
    items: list[RoomTypeReviewBreakdownItem]
    unattributed_reviews: int


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
