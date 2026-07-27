"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

// Footer chi hien o khu vuc marketing/cong khai - khu vuc app
// (checkout/bookings/account/admin/staff/super-admin) khong co footer, giong
// dashboard SaaS that.
const NO_FOOTER_PREFIXES = ["/staff", "/super-admin", "/checkout", "/bookings", "/account"];

// Footer chi mang tinh tuong trung (khong phai component dieu huong that), nen
// cac muc ben duoi la text thuong, khong phai link co the bam.
const EXPLORE_ITEMS = ["Trang chủ", "Tìm khách sạn", "Đăng ký khách sạn"];

const SUPPORT_ITEMS = ["Đăng nhập", "Đăng ký", "Booking của tôi", "Quên mật khẩu"];

const CONTACT_EMAIL = "hdung261204@gmail.com";

export function Footer() {
  const pathname = usePathname();

  const isAdminShell = pathname.startsWith("/admin") && pathname !== "/admin/register";
  if (isAdminShell || NO_FOOTER_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <footer className="relative mt-20 overflow-hidden text-neutral-300">
      <Image src="/footer-bg.jpg" alt="" fill sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/70 via-neutral-950/90 to-neutral-950" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 md:grid-cols-4">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-white">
            Hotel<span className="text-primary">Booking</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-neutral-400">
            Nền tảng đặt phòng khách sạn nhanh chóng, minh bạch và đáng tin cậy.
          </p>
        </div>

        <div>
          <h3 className="relative pb-2 text-xs font-bold tracking-wider text-white uppercase after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-6 after:bg-primary">
            Khám phá
          </h3>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {EXPLORE_ITEMS.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="relative pb-2 text-xs font-bold tracking-wider text-white uppercase after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-6 after:bg-primary">
            Hỗ trợ
          </h3>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {SUPPORT_ITEMS.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="relative pb-2 text-xs font-bold tracking-wider text-white uppercase after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-6 after:bg-primary">
            Liên hệ
          </h3>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            <li>{CONTACT_EMAIL}</li>
          </ul>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-neutral-500 sm:px-6">
          © {new Date().getFullYear()} Hotel Booking. Đồ án tốt nghiệp.
        </div>
      </div>
    </footer>
  );
}
