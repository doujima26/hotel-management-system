from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.core.enums import DiscountType, PricingRecurrence
from app.models.entities import PricingRule, RoomType
from app.repositories.pricing_repository import list_active_pricing_rules
from app.repositories.room_repository import get_rates_in_range

# Nguon sinh ra gia cua 1 dem.
PRICE_SOURCE_MANUAL = "manual"
PRICE_SOURCE_RULE = "rule"
PRICE_SOURCE_BASE = "base"


# Gia 1 dem kem nguon sinh ra no. rule_id va rule_name chi co khi source la rule.
@dataclass(frozen=True)
class NightlyPrice:
    price: float
    source: str
    rule_id: int | None = None
    rule_name: str | None = None


# Doi thu trong tuan cua Python (0 la thu hai) sang quy uoc EXTRACT(DOW) cua
# PostgreSQL (0 la chu nhat) - dung chung quy uoc voi cot weekdays.
def to_postgres_weekday(day: date) -> int:
    return (day.weekday() + 1) % 7


# Kiem tra 1 ngay co nam trong khoang thang/ngay lap lai hang nam khong. Khoang
# vat qua giao thua (vi du 28/12 den 02/01) duoc tinh thanh 2 doan.
def _in_yearly_window(day: date, start_month: int, start_day: int, end_month: int, end_day: int) -> bool:
    start = (start_month, start_day)
    end = (end_month, end_day)
    current = (day.month, day.day)
    if start <= end:
        return start <= current <= end
    return current >= start or current <= end


# Kiem tra 1 quy tac co ap cho 1 ngay cu the khong: dung khoang ngay va dung
# thu trong tuan.
def rule_matches_date(rule: PricingRule, day: date) -> bool:
    if rule.weekdays and to_postgres_weekday(day) not in rule.weekdays:
        return False

    if rule.recurrence == PricingRecurrence.YEARLY:
        if None in (rule.start_month, rule.start_day, rule.end_month, rule.end_day):
            return False
        return _in_yearly_window(day, rule.start_month, rule.start_day, rule.end_month, rule.end_day)

    if rule.start_date is None or rule.end_date is None:
        return False
    return rule.start_date <= day <= rule.end_date


# Tinh gia sau khi ap muc dieu chinh len gia goc. adjustment_value mang dau:
# am la giam gia, duong la phu thu.
def apply_adjustment(base_price: float, adjustment_type: DiscountType, adjustment_value: float) -> float:
    if adjustment_type == DiscountType.PERCENTAGE:
        return round(base_price * (1 + adjustment_value / 100), 2)
    return round(base_price + adjustment_value, 2)


# Loc cac quy tac ap duoc cho 1 loai phong: quy tac cua ca khach san hoac quy
# tac chi danh rieng cho loai phong do.
def rules_for_room_type(rules: list[PricingRule], room_type_id: int) -> list[PricingRule]:
    return [rule for rule in rules if rule.room_type_id is None or rule.room_type_id == room_type_id]


# Chon gia cho 1 dem theo thu tu uu tien: gia sua tay, roi quy tac dau tien
# khop duoc va cho ra gia duong, cuoi cung la base_price. Danh sach rules phai
# duoc sap xep san theo do uu tien giam dan.
def _resolve_one_night(
    day: date,
    base_price: float,
    overrides: dict[date, float],
    rules: list[PricingRule],
) -> NightlyPrice:
    override_price = overrides.get(day)
    if override_price is not None:
        return NightlyPrice(price=override_price, source=PRICE_SOURCE_MANUAL)

    for rule in rules:
        if not rule_matches_date(rule, day):
            continue
        price = apply_adjustment(base_price, rule.adjustment_type, float(rule.adjustment_value))
        if price <= 0:
            continue
        return NightlyPrice(price=price, source=PRICE_SOURCE_RULE, rule_id=rule.id, rule_name=rule.name)

    return NightlyPrice(price=base_price, source=PRICE_SOURCE_BASE)


# Tinh gia tung ngay cua 1 loai phong trong khoang [from_date, to_date] (dong ca
# 2 dau). Truyen san rules khi xu ly nhieu khach san mot luc de khong phai truy
# van lai quy tac cho tung loai phong.
def resolve_nightly_prices(
    db: Session,
    room_type: RoomType,
    from_date: date,
    to_date: date,
    rules: list[PricingRule] | None = None,
) -> dict[date, NightlyPrice]:
    if to_date < from_date:
        return {}

    base_price = float(room_type.base_price)
    overrides = get_rates_in_range(db, room_type.id, from_date, to_date)
    if rules is None:
        rules = list_active_pricing_rules(db, room_type.hotel_id)
    applicable = rules_for_room_type(rules, room_type.id)

    prices: dict[date, NightlyPrice] = {}
    current = from_date
    while current <= to_date:
        prices[current] = _resolve_one_night(current, base_price, overrides, applicable)
        current += timedelta(days=1)
    return prices


# Tinh tong tien phong cho 1 khoang o va tra ve kem gia tung dem. Dem cuoi cung
# la dem truoc ngay tra phong nen khoang tinh gia dung to_date la check_out tru
# 1 ngay.
def resolve_stay_total(
    db: Session,
    room_type: RoomType,
    check_in: date,
    check_out: date,
    rules: list[PricingRule] | None = None,
) -> tuple[float, dict[date, NightlyPrice]]:
    prices = resolve_nightly_prices(db, room_type, check_in, check_out - timedelta(days=1), rules=rules)
    total = sum(night.price for night in prices.values())
    return total, prices
