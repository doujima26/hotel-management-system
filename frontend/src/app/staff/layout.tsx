"use client";

import { RequireAuth } from "@/components/shared/RequireAuth";
import { AppSidebarShell } from "@/components/shared/AppSidebarShell";

const TABS = [
  { href: "/staff/bookings", label: "Đơn đặt phòng" },
  { href: "/staff/rooms", label: "Sơ đồ phòng" },
  { href: "/staff/schedule", label: "Lịch làm việc" },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth allow={["staff"]}>
      <AppSidebarShell title="Vận hành khách sạn" items={TABS}>
        {children}
      </AppSidebarShell>
    </RequireAuth>
  );
}
