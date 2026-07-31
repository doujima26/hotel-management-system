"use client";

import { RequireAuth } from "@/components/shared/RequireAuth";
import { AppSidebarShell, type SidebarGroup } from "@/components/shared/AppSidebarShell";

const NAV_GROUPS: SidebarGroup[] = [
  // Trang mo dau - dat rieng dau menu, khong thuoc nhom nao.
  { items: [{ href: "/super-admin/dashboard", label: "Tổng quan" }] },
  {
    label: "Kiểm soát nền tảng",
    items: [
      { href: "/super-admin/hotels", label: "Khách sạn" },
      { href: "/super-admin/users", label: "Người dùng" },
    ],
  },
  {
    label: "Dữ liệu dùng chung",
    items: [{ href: "/super-admin/amenities", label: "Danh mục tiện nghi" }],
  },
  {
    label: "Nhật ký quản trị",
    items: [{ href: "/super-admin/action-logs", label: "Nhật ký quản trị" }],
  },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth allow={["super_admin"]}>
      <AppSidebarShell title="Quản trị nền tảng" items={NAV_GROUPS}>
        {children}
      </AppSidebarShell>
    </RequireAuth>
  );
}
