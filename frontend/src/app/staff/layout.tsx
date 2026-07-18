"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/staff/bookings", label: "Booking khách sạn" },
  { href: "/staff/rooms", label: "Sơ đồ phòng" },
  { href: "/staff/schedule", label: "Lịch làm việc" },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth allow={["staff"]}>
      <StaffShell>{children}</StaffShell>
    </RequireAuth>
  );
}

function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Vận hành khách sạn</h1>
        <nav className="mt-3 flex flex-wrap gap-2 border-b pb-2">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                pathname.startsWith(tab.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
