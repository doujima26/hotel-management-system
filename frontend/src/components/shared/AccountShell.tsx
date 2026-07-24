"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Heart, ShieldCheck, User as UserIcon, type LucideIcon } from "lucide-react";

// Cac muc trong khu vuc tai khoan - dung chung cho sidebar va breadcrumb.
const SECTIONS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/account", label: "Thông tin cá nhân", icon: UserIcon },
  { href: "/account/security", label: "Cài đặt bảo mật", icon: ShieldCheck },
  { href: "/account/wishlist", label: "Yêu thích", icon: Heart },
  { href: "/bookings", label: "Đơn đặt phòng", icon: CalendarCheck },
];

// Khung chung cho cac trang tai khoan: breadcrumb theo trang + menu trai.
export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = SECTIONS.find((section) => section.href === pathname);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <nav className="text-sm text-muted-foreground">
        <Link href="/account" className="hover:text-foreground">
          Tài khoản
        </Link>
        {current && (
          <>
            {" › "}
            <span className="text-foreground">{current.label}</span>
          </>
        )}
      </nav>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        <aside className="lg:w-64 lg:shrink-0">
          <nav className="flex flex-col gap-1 rounded-xl border p-2">
            {SECTIONS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                    active ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
