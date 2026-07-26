from datetime import date, datetime, time, timedelta, timezone

from app.core.config import settings


# Mui gio nghiep vu cua he thong (mac dinh +07:00 - gio Viet Nam).
def business_timezone() -> timezone:
    return timezone(timedelta(hours=settings.business_timezone_offset_hours))


# Ngay "hom nay" theo mui gio nghiep vu. Phai dung ham nay thay cho date.today()
# o cac thong ke, vi date.today() lay theo mui gio may chu (may chu chay UTC se
# tra ve sai ngay so voi nguoi dung Viet Nam).
def business_today() -> date:
    return datetime.now(business_timezone()).date()


# Doi khoang NGAY theo mui gio nghiep vu thanh khoang thoi diem nua mo
# [start, end) de loc dung cac cot TIMESTAMPTZ.
#
# Vi du mui gio +07: ngay 26/07 nghia la 26/07 00:00+07 -> 27/07 00:00+07,
# tuc 25/07 17:00Z -> 26/07 17:00Z. Neu neo thang vao 00:00Z nhu truoc day thi
# cac giao dich luc 00:00-07:00 gio Viet Nam se bi tinh nham sang ngay hom truoc.
def day_range_to_instants(from_date: date, to_date: date) -> tuple[datetime, datetime]:
    tz = business_timezone()
    start = datetime.combine(from_date, time.min, tzinfo=tz)
    end_exclusive = datetime.combine(to_date + timedelta(days=1), time.min, tzinfo=tz)
    return start, end_exclusive
