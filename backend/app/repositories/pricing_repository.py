from sqlalchemy.orm import Session

from app.core.enums import DiscountType, HotelStatus, PricingRecurrence
from app.models.entities import Hotel, PricingRule
from app.schemas.rooms import CreatePricingRuleRequest


# Sap xep quy tac theo do uu tien giam dan, cung do uu tien thi quy tac tao sau
# dung truoc - bo giai gia lay quy tac dau tien khop duoc trong danh sach nay.
def _ordered(query):
    return query.order_by(PricingRule.priority.desc(), PricingRule.id.desc())


# Lay quy tac gia dang bat cua 1 khach san.
def list_active_pricing_rules(db: Session, hotel_id: int) -> list[PricingRule]:
    return _ordered(
        db.query(PricingRule).filter(
            PricingRule.hotel_id == hotel_id,
            PricingRule.is_active.is_(True),
        )
    ).all()


# Lay quy tac gia dang bat cua nhieu khach san trong 1 luot, gom theo hotel_id -
# dung o trang tim kiem de tranh N+1.
def list_active_pricing_rules_by_hotel_ids(db: Session, hotel_ids: list[int]) -> dict[int, list[PricingRule]]:
    if not hotel_ids:
        return {}

    rows = _ordered(
        db.query(PricingRule).filter(
            PricingRule.hotel_id.in_(hotel_ids),
            PricingRule.is_active.is_(True),
        )
    ).all()

    grouped: dict[int, list[PricingRule]] = {}
    for rule in rows:
        grouped.setdefault(rule.hotel_id, []).append(rule)
    return grouped


# Lay quy tac GIAM GIA dang bat cua moi khach san da duyet - dung cho trang chu
# gioi thieu uu dai theo mua. Quy tac phu thu (gia tri duong) bi loai.
def list_active_discount_rules_for_approved_hotels(db: Session) -> list[PricingRule]:
    return _ordered(
        db.query(PricingRule)
        .join(Hotel, Hotel.id == PricingRule.hotel_id)
        .filter(
            Hotel.status == HotelStatus.APPROVED,
            PricingRule.is_active.is_(True),
            PricingRule.adjustment_value < 0,
        )
    ).all()


# Lay toan bo quy tac gia cua khach san ke ca dang tat - dung cho man quan ly.
def list_pricing_rule_records(db: Session, hotel_id: int) -> list[PricingRule]:
    return _ordered(db.query(PricingRule).filter(PricingRule.hotel_id == hotel_id)).all()


# Lay quy tac gia theo id.
def get_pricing_rule_by_id(db: Session, rule_id: int) -> PricingRule | None:
    return db.query(PricingRule).filter(PricingRule.id == rule_id).first()


# Tao quy tac gia moi cho khach san.
def create_pricing_rule_record(db: Session, hotel_id: int, payload: CreatePricingRuleRequest) -> PricingRule:
    rule = PricingRule(
        hotel_id=hotel_id,
        room_type_id=payload.room_type_id,
        name=payload.name,
        description=payload.description,
        recurrence=PricingRecurrence(payload.recurrence),
        start_date=payload.start_date,
        end_date=payload.end_date,
        start_month=payload.start_month,
        start_day=payload.start_day,
        end_month=payload.end_month,
        end_day=payload.end_day,
        weekdays=payload.weekdays,
        adjustment_type=DiscountType(payload.adjustment_type),
        adjustment_value=payload.adjustment_value,
        priority=payload.priority,
        is_active=payload.is_active,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


# Luu thay doi cua quy tac gia.
def save_pricing_rule(db: Session, rule: PricingRule) -> PricingRule:
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


# Xoa quy tac gia.
def delete_pricing_rule_record(db: Session, rule: PricingRule) -> None:
    db.delete(rule)
    db.commit()
