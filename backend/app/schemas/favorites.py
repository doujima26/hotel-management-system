from datetime import date, datetime

from pydantic import BaseModel


# Schema du lieu tra ve 1 khach san yeu thich. Mang du thong tin de hien thanh
# the giong ket qua tim kiem, cong them tinh trang nhan dat phong va uu dai
# theo mua dang co - hai thu chi trang yeu thich moi can.
class FavoriteResponse(BaseModel):
    id: int
    hotel_id: int
    hotel_name: str
    city: str
    district: str | None = None
    address: str | None = None
    star_rating: int | None = None
    avg_rating: float = 0
    total_reviews: int = 0
    primary_image_url: str | None = None
    from_price: float | None = None
    # Khach san dang tam dung hoac chua duyet thi khong dat phong duoc nhung van
    # giu trong danh sach yeu thich.
    is_bookable: bool = True
    deal_label: str | None = None
    deal_discount_percent: float | None = None
    deal_starts_on: date | None = None
    created_at: datetime
