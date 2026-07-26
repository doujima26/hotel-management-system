import type { UserRole } from "@/types/enums";

// Duong dan chinh sau khi dang nhap / diem den mac dinh trong Navbar, tuy theo role.
export function getRoleHomePath(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/super-admin/hotels";
    case "admin":
      // AdminHotelLayout ((hotel)/layout.tsx) tu redirect sang /admin/onboarding
      // neu admin chua dang ky khach san. Vao thang Dashboard vi day la tac vu
      // hang ngay (xem tai-lieu-thiet-ke-extranet.md muc 6.1).
      return "/admin/dashboard";
    case "staff":
      return "/staff/bookings";
    case "user":
    default:
      return "/";
  }
}
