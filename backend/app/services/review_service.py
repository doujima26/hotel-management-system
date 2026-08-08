from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.enums import BookingStatus, UserRole
from app.models.entities import Booking, Review, User
from app.repositories.booking_repository import get_booking_by_id, list_room_type_names_by_booking_ids
from app.repositories.hotel_repository import get_hotel_by_id
from app.repositories.review_repository import (
    count_reviews_by_room_type_and_rating,
    count_reviews_without_room_type,
    create_review_record,
    delete_review_record,
    get_review_by_id,
    get_review_by_user_and_booking,
    list_reviews_with_user_and_booking_by_hotel,
    save_review,
)
from app.schemas.reviews import (
    CreateReviewRequest,
    DeleteReviewResponse,
    ReviewResponse,
    RoomTypeReviewBreakdownItem,
    RoomTypeReviewBreakdownResponse,
    UpdateReviewRequest,
)
from app.services.hotel_service import get_operating_admin_hotel


# Chuyen Review + User + Booking thanh du lieu tra ve. room_type_names duoc
# truyen vao san chu khong tu truy van ben trong, de khi liet ke nhieu danh gia
# chi can 1 query lay ten loai phong cho ca danh sach.
def _serialize_review(review: Review, user: User, booking: Booking, room_type_names: list[str]) -> dict:
    return ReviewResponse(
        id=review.id,
        user_id=review.user_id,
        reviewer_name=user.full_name,
        hotel_id=review.hotel_id,
        booking_id=review.booking_id,
        booking_code=booking.booking_code,
        check_in_date=booking.check_in_date,
        check_out_date=booking.check_out_date,
        room_type_names=room_type_names,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
    ).model_dump(mode="json")


# Chuyen ca danh sach danh gia thanh du lieu tra ve, lay ten loai phong cua toan
# bo booking trong 1 query duy nhat.
def _serialize_review_rows(db: Session, rows: list[tuple[Review, User, Booking]]) -> list[dict]:
    names_by_booking = list_room_type_names_by_booking_ids(db, [booking.id for _, _, booking in rows])
    return [
        _serialize_review(review, user, booking, names_by_booking.get(booking.id, []))
        for review, user, booking in rows
    ]


# Dung du lieu tra ve cho 1 danh gia don le (luc tao/sua) - tu lay them booking
# va ten loai phong cua rieng danh gia do.
def _serialize_single_review(db: Session, review: Review, user: User) -> dict:
    booking = get_booking_by_id(db, review.booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Đơn đặt phòng của đánh giá không tồn tại")
    return _serialize_review(review, user, booking, list_room_type_names_by_booking_ids(db, [booking.id]).get(booking.id, []))


# Xu ly khach danh gia 1 booking da checked_out. Cap nhat avg_rating/total_reviews
# cua khach san do trigger DB (fn_update_hotel_rating) tu dong xu ly, khong can code them.
def create_review(db: Session, current_user: User, payload: CreateReviewRequest) -> dict:
    booking = get_booking_by_id(db, payload.booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Đơn đặt phòng không tồn tại")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn chỉ được đánh giá đơn đặt phòng của mình")
    if booking.status != BookingStatus.CHECKED_OUT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chỉ được đánh giá sau khi đã trả phòng")
    if get_review_by_user_and_booking(db, current_user.id, booking.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bạn đã đánh giá đơn đặt phòng này rồi")

    try:
        review = create_review_record(
            db,
            user_id=current_user.id,
            hotel_id=booking.hotel_id,
            booking_id=booking.id,
            rating=payload.rating,
            comment=payload.comment,
        )
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bạn đã đánh giá đơn đặt phòng này rồi") from exc

    room_type_names = list_room_type_names_by_booking_ids(db, [booking.id]).get(booking.id, [])
    return _serialize_review(review, current_user, booking, room_type_names)


# Xu ly lay danh sach danh gia cong khai cua 1 khach san.
def list_hotel_reviews(db: Session, hotel_id: int) -> list[dict]:
    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khách sạn không tồn tại")

    return _serialize_review_rows(db, list_reviews_with_user_and_booking_by_hotel(db, hotel_id))


# Xu ly Admin xem toan bo danh gia cua khach san minh - khac ham cong khai o
# tren, hotel duoc server tu suy ra tu current_user (khong nhan hotel_id tu
# client) giong quy uoc chung cua cac endpoint Admin khac.
def list_hotel_reviews_for_admin(db: Session, current_user: User) -> list[dict]:
    hotel = get_operating_admin_hotel(db, current_user)
    return _serialize_review_rows(db, list_reviews_with_user_and_booking_by_hotel(db, hotel.id))


# Nguong chia dai diem (thang 10). Dat o tang service vi day la quy tac nghiep
# vu, khong phai chuyen truy van - trung nguong nhan diem dung o giao dien
# (Rat tot tu 8, Tot tu 7) de nguoi doc khong thay 2 cach phan loai khac nhau.
_HIGH_RATING_FROM = 8
_MEDIUM_RATING_FROM = 6


# Xu ly Admin xem phan bo danh gia theo loai phong cua khach san minh: loai phong
# nao dang duoc danh gia cao nhat / thap nhat, va trong tung loai phong thi ty le
# danh gia cao/trung binh/thap ra sao.
def get_room_type_review_breakdown_for_admin(db: Session, current_user: User) -> dict:
    hotel = get_operating_admin_hotel(db, current_user)

    # Gom cac dong (loai phong, diem, so luot) thanh 1 dong cho moi loai phong.
    grouped: dict[int, dict] = {}
    for room_type_id, name, rating, count in count_reviews_by_room_type_and_rating(db, hotel.id):
        row = grouped.setdefault(
            room_type_id,
            {"name": name, "total": 0, "rating_sum": 0, "high": 0, "medium": 0, "low": 0},
        )
        row["total"] += count
        row["rating_sum"] += rating * count
        if rating >= _HIGH_RATING_FROM:
            row["high"] += count
        elif rating >= _MEDIUM_RATING_FROM:
            row["medium"] += count
        else:
            row["low"] += count

    items = [
        RoomTypeReviewBreakdownItem(
            room_type_id=room_type_id,
            name=row["name"],
            total_reviews=row["total"],
            avg_rating=round(row["rating_sum"] / row["total"], 1),
            high_count=row["high"],
            medium_count=row["medium"],
            low_count=row["low"],
        )
        for room_type_id, row in grouped.items()
    ]
    # Diem cao nhat len dau; cung diem thi loai phong nhieu luot danh gia hon dung
    # truoc (diem tin cay hon), roi den ten de thu tu on dinh.
    items.sort(key=lambda item: (-item.avg_rating, -item.total_reviews, item.name))

    return RoomTypeReviewBreakdownResponse(
        hotel_id=hotel.id,
        items=items,
        unattributed_reviews=count_reviews_without_room_type(db, hotel.id),
    ).model_dump(mode="json")


# Xu ly khach tu sua danh gia cua chinh minh. Trigger DB tu cap nhat lai
# avg_rating cua khach san khi rating doi.
def update_review(db: Session, current_user: User, review_id: int, payload: UpdateReviewRequest) -> dict:
    review = get_review_by_id(db, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Đánh giá không tồn tại")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn chỉ được sửa đánh giá của mình")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(review, field, value)

    review = save_review(db, review)
    return _serialize_single_review(db, review, current_user)


# Xu ly xoa danh gia - tac gia tu xoa, hoac Admin cua khach san go danh gia vi pham.
def delete_review(db: Session, current_user: User, review_id: int) -> dict:
    review = get_review_by_id(db, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Đánh giá không tồn tại")

    is_author = review.user_id == current_user.id
    is_hotel_admin = False
    if current_user.role == UserRole.ADMIN:
        hotel = get_hotel_by_id(db, review.hotel_id)
        is_hotel_admin = bool(hotel and hotel.owner_id == current_user.id)

    if not is_author and not is_hotel_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chỉ được xóa đánh giá của mình hoặc của khách sạn mình quản lý",
        )

    delete_review_record(db, review)
    return DeleteReviewResponse(id=review_id).model_dump(mode="json")
