# Hotel Management System

Nền tảng B2B2C tích hợp đặt phòng trực tuyến và quản lý nghiệp vụ khách sạn trên cùng một hệ thống, vận hành theo mô hình Thương nhân — nền tảng thu hộ tiền khách và đối soát công nợ với khách sạn.

## Giới thiệu

Hệ thống giải quyết bốn vấn đề của khách sạn vừa và nhỏ khi kinh doanh trực tuyến:

- **Đặt trùng phòng** khi nhiều khách đặt cùng lúc — xử lý bằng khóa bi quan ở tầng cơ sở dữ liệu
- **Giá phòng cố định** — bộ giải giá ba tầng tự động điều chỉnh theo ngày, quy tắc mùa/lễ, hoặc giá gốc
- **Dòng tiền không minh bạch** — thanh toán chuyển khoản qua SePay có xác thực, đối soát công nợ tự động giữa nền tảng và khách sạn
- **Thiếu công cụ vận hành** — quản lý phòng, check-in/check-out, ca làm việc cho lễ tân và quản trị khách sạn

Hệ thống phục vụ 4 vai trò: Khách hàng, Quản trị khách sạn, Nhân viên, Quản trị hệ thống (Super Admin).

## Kiến trúc

```
Next.js (Giao diện)  →  FastAPI (Máy chủ ứng dụng)  →  PostgreSQL (Cơ sở dữ liệu)
                              ↓
                    Endpoint → Service → Repository → Model
```

## Công nghệ sử dụng

| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Giao diện người dùng | Next.js, React, TypeScript | 16.2.10 / 19.2.4 / 5.x |
| Định dạng giao diện | Tailwind CSS, shadcn/ui | 4 |
| Máy chủ ứng dụng | FastAPI, Uvicorn | 0.115.0 / 0.30.6 |
| Ngôn ngữ máy chủ | Python | 3.13 |
| Ánh xạ đối tượng quan hệ | SQLAlchemy | 2.0.36 |
| Kiểm tra dữ liệu | Pydantic | 2.9.2 |
| Cơ sở dữ liệu | PostgreSQL | 16.x |
| Xác thực | JWT (python-jose), bcrypt | 3.3.0 / 3.2.2 |
| Thanh toán | SePay (webhook + QR chuyển khoản) | — |
| Gửi thư điện tử | Gmail SMTP | — |
| Triển khai | Vercel (giao diện) · Railway (máy chủ + CSDL) | — |

## Cài đặt

### Yêu cầu

- Node.js (cho Next.js)
- Python 3.13
- PostgreSQL 16
- Tài khoản SePay và Gmail (mật khẩu ứng dụng) để chạy đầy đủ luồng thanh toán và email

### Máy chủ (backend)

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Tạo file .env với các biến: DATABASE_URL, JWT_SECRET_KEY,
# SEPAY_WEBHOOK_SECRET, SMTP_USERNAME, SMTP_PASSWORD, ...

uvicorn app.main:app --reload
```

### Giao diện (frontend)

```bash
cd frontend
npm install

# Tạo file .env.local với biến trỏ tới địa chỉ backend

npm run dev
```

> Hệ thống dùng cơ chế viết lại đường dẫn (rewrites) của Next.js để gộp giao diện và máy chủ về cùng một domain khi triển khai thật — không cần cấu hình CORS.

### Triển khai thật

Giao diện triển khai trên **Vercel**, máy chủ ứng dụng và cơ sở dữ liệu trên **Railway**.
