import type { UserRole } from "@/types/enums";

// Duong dan chinh sau khi dang nhap / diem den mac dinh trong Navbar, tuy theo role.
export function getRoleHomePath(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/super-admin/hotels";
    case "admin":
      // AdminHotelLayout ((hotel)/layout.tsx) tu redirect sang /admin/onboarding
      // neu admin chua dang ky khach san.
      return "/admin/hotel-profile";
    case "staff":
      return "/staff/bookings";
    case "user":
    default:
      return "/";
  }
}
