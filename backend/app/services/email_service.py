import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import settings

logger = logging.getLogger(__name__)

# So giay cho toi da khi ket noi may chu SMTP, tranh treo request neu Gmail cham.
_SMTP_TIMEOUT_SECONDS = 15


# Kiem tra da co du thong tin de gui mail that chua. Chua du thi he thong ghi
# noi dung mail ra log thay vi gui, de moi truong phat trien van chay duoc.
def is_email_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_username and settings.smtp_password)


# Boc noi dung thanh mot trang HTML gon, dung chung cho moi loai mail.
def _render_layout(title: str, body_html: str) -> str:
    return f"""\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2933">
  <div style="background:#e85d3d;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:18px;color:#fff">{settings.smtp_from}</h1>
  </div>
  <div style="border:1px solid #e4e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px">
    <h2 style="margin:0 0 16px;font-size:16px">{title}</h2>
    {body_html}
    <p style="margin:24px 0 0;font-size:12px;color:#7b8794">
      Email tự động, vui lòng không trả lời thư này.
    </p>
  </div>
</div>"""


# Gui 1 email. Khong nem loi ra ngoai: gui mail hong khong duoc lam that bai
# nghiep vu da hoan tat (dat phong, doi mat khau...). Tra ve True neu da gui.
def send_email(to_email: str, subject: str, title: str, body_html: str) -> bool:
    html = _render_layout(title, body_html)

    if not is_email_configured():
        logger.warning("Chua cau hinh SMTP, khong gui mail toi %s. Tieu de: %s", to_email, subject)
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((settings.smtp_from, settings.smtp_username))
    message["To"] = to_email
    message.set_content("Email nay can trinh duyet ho tro HTML de hien thi day du.")
    message.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=_SMTP_TIMEOUT_SECONDS) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
        logger.info("Da gui mail toi %s: %s", to_email, subject)
        return True
    except Exception:
        logger.exception("Gui mail toi %s that bai: %s", to_email, subject)
        return False


# Day viec gui mail sang tien trinh nen de nghiep vu tra ve ngay thay vi cho
# SMTP xong. Khong co background_tasks (goi tu script hoac kiem thu) thi gui
# truc tiep.
def queue_email(background_tasks, sender, *args) -> None:
    if background_tasks is None:
        sender(*args)
        return
    background_tasks.add_task(sender, *args)


# ===== Cac loai mail cu the =====


# Ma OTP dat lai mat khau.
def send_password_reset_otp(to_email: str, otp: str, expires_minutes: int) -> bool:
    body = f"""
    <p>Bạn vừa yêu cầu đặt lại mật khẩu. Nhập mã sau để tiếp tục:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:16px 0">{otp}</p>
    <p>Mã có hiệu lực trong {expires_minutes} phút.</p>
    <p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này - mật khẩu hiện tại vẫn an toàn.</p>
    """
    return send_email(to_email, "Mã đặt lại mật khẩu", "Đặt lại mật khẩu", body)


# Ma OTP xac thuc tai khoan.
def send_account_verify_otp(to_email: str, otp: str, expires_minutes: int) -> bool:
    body = f"""
    <p>Nhập mã sau để xác thực tài khoản của bạn:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:16px 0">{otp}</p>
    <p>Mã có hiệu lực trong {expires_minutes} phút.</p>
    """
    return send_email(to_email, "Mã xác thực tài khoản", "Xác thực tài khoản", body)


# Thong tin dang nhap cua tai khoan nhan vien moi tao.
def send_staff_account_created(to_email: str, full_name: str, hotel_name: str, temp_password: str) -> bool:
    body = f"""
    <p>Xin chào {full_name},</p>
    <p>Tài khoản nhân viên của bạn tại <strong>{hotel_name}</strong> đã được tạo.</p>
    <table style="margin:16px 0;font-size:14px">
      <tr><td style="padding:4px 12px 4px 0;color:#7b8794">Email đăng nhập</td><td><strong>{to_email}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#7b8794">Mật khẩu tạm</td><td><strong>{temp_password}</strong></td></tr>
    </table>
    <p>Vui lòng đăng nhập và đổi mật khẩu ngay trong lần sử dụng đầu tiên.</p>
    """
    return send_email(to_email, "Tài khoản nhân viên đã được tạo", "Thông tin đăng nhập", body)


# Ket qua duyet ho so khach san gui cho chu khach san.
def send_hotel_review_result(to_email: str, hotel_name: str, approved: bool, reason: str | None) -> bool:
    if approved:
        body = f"""
        <p>Hồ sơ khách sạn <strong>{hotel_name}</strong> đã được phê duyệt.</p>
        <p>Bạn có thể đăng nhập để thêm loại phòng, thiết lập giá và bắt đầu nhận đặt phòng.</p>
        """
        return send_email(to_email, f"Khách sạn {hotel_name} đã được duyệt", "Hồ sơ được duyệt", body)

    ly_do = f"<p>Lý do: {reason}</p>" if reason else ""
    body = f"""
    <p>Rất tiếc, hồ sơ khách sạn <strong>{hotel_name}</strong> chưa được duyệt.</p>
    {ly_do}
    <p>Bạn có thể cập nhật lại thông tin và gửi duyệt lần nữa.</p>
    """
    return send_email(to_email, f"Khách sạn {hotel_name} chưa được duyệt", "Hồ sơ chưa được duyệt", body)


# Xac nhan don dat phong da duoc khach san chap nhan.
def send_booking_confirmed(
    to_email: str,
    guest_name: str,
    booking_code: str,
    hotel_name: str,
    check_in: str,
    check_out: str,
    total_amount: float,
) -> bool:
    body = f"""
    <p>Xin chào {guest_name},</p>
    <p>Đơn đặt phòng của bạn đã được <strong>{hotel_name}</strong> xác nhận.</p>
    <table style="margin:16px 0;font-size:14px">
      <tr><td style="padding:4px 12px 4px 0;color:#7b8794">Mã đơn</td><td><strong>{booking_code}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#7b8794">Nhận phòng</td><td>{check_in}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#7b8794">Trả phòng</td><td>{check_out}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#7b8794">Tổng tiền</td><td><strong>{total_amount:,.0f} đ</strong></td></tr>
    </table>
    <p>Vui lòng xuất trình mã đơn khi nhận phòng.</p>
    """
    return send_email(to_email, f"Xác nhận đặt phòng {booking_code}", "Đặt phòng thành công", body)
