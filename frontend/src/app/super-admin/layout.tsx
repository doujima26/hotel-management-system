"use client";

import { RequireAuth } from "@/components/shared/RequireAuth";
import { AppSidebarShell } from "@/components/shared/AppSidebarShell";

const TABS = [
  { href: "/super-admin/hotels", label: "Khách sạn" },
  { href: "/super-admin/users", label: "Người dùng" },
  { href: "/super-admin/amenities", label: "Danh mục tiện nghi" },
  { href: "/super-admin/dashboard", label: "Dashboard" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth allow={["super_admin"]}>
      <AppSidebarShell title="Quản trị nền tảng" items={TABS}>
        {children}
      </AppSidebarShell>
    </RequireAuth>
  );
}
