import type { UserRole } from "@/types/enums";

// Duong dan chinh sau khi dang nhap / diem den mac dinh trong Navbar, tuy theo role.
// admin/staff tam thoi ve trang chu vi khu vuc rieng (Milestone 2/4) chua duoc xay.
export function getRoleHomePath(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/super-admin/hotels";
    case "admin":
    case "staff":
    case "user":
    default:
      return "/";
  }
}
