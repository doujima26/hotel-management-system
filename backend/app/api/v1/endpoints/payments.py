import json
import logging

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.core.security import verify_sepay_signature
from app.db.session import get_db
from app.models.entities import User
from app.schemas.payments import SepayWebhookPayload
from app.services.payment_service import (
    get_payment_detail as get_payment_detail_action,
    handle_sepay_webhook as handle_sepay_webhook_action,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


# SePay bao co giao dich chuyen khoan moi.
#
# Endpoint nay KHONG yeu cau dang nhap - nguoi goi la may chu SePay, khong phai
# nguoi dung. Thay cho token, moi request duoc xac thuc bang chu ky HMAC-SHA256.
#
# Ma tra ve quyet dinh SePay co gui lai hay khong (gui lai toi 7 lan neu ngoai
# 200-299), nen phai chon dung:
#   - 200 khi da ghi nhan xong, KE CA khi khong khop duoc don. Tien da vao tai
#     khoan roi, bat SePay gui lai 7 lan cung khong lam no khop duoc.
#   - 401 khi chu ky sai: gui lai cung sai, nhung khong duoc bao thanh cong.
#   - 500 khi loi he thong: day la truong hop DUY NHAT dang de SePay gui lai.
@router.post("/sepay/webhook")
async def sepay_webhook(request: Request, db: Session = Depends(get_db)):
    # Phai lay chuoi byte GOC de tinh chu ky. De FastAPI phan tich JSON roi tao
    # lai chuoi se ra byte khac va chu ky khong bao gio khop.
    raw_body = await request.body()
    hop_le, ly_do = verify_sepay_signature(
        raw_body,
        request.headers.get("X-SePay-Signature", ""),
        request.headers.get("X-SePay-Timestamp", ""),
    )
    if not hop_le:
        # Ghi ly do vao log cho minh xem, khong tra ra ngoai: noi ro sai o dau la
        # chi cho nguoi dang thu gia mao biet duong sua.
        logger.warning("Tu choi webhook SePay: %s", ly_do)
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"success": False})

    try:
        raw_payload = json.loads(raw_body)
        payload = SepayWebhookPayload.model_validate(raw_payload)
    except (json.JSONDecodeError, ValidationError) as exc:
        # Chu ky dung nghia la SePay that su gui goi nay, nhung minh khong doc
        # duoc. Gui lai cung khong doc duoc nen tra 200 kem success=false, tranh
        # 7 lan thu vo ich.
        logger.error("Khong doc duoc payload webhook SePay: %s", exc)
        return JSONResponse(status_code=status.HTTP_200_OK, content={"success": False})

    data = handle_sepay_webhook_action(db, payload, raw_payload)
    return JSONResponse(status_code=status.HTTP_200_OK, content=data)


# Khach xem chi tiet 1 thanh toan cua minh.
@router.get("/{payment_id}")
def get_payment_detail(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = get_payment_detail_action(db, current_user, payment_id)
    return ok(data, "Chi tiet thanh toan")
