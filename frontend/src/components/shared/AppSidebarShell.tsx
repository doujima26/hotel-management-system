"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppSidebarShellProps {
  title: string;
  items: { href: string; label: string }[];
  header?: React.ReactNode;
  children: React.ReactNode;
}

// Khung side-rail dung chung cho khu vuc Admin/Staff/Super Admin (N3 Side-rail
// theo DESIGN.md) - thay the Navbar chung o cac trang nay. Tren mobile rut gon
// thanh thanh ngang cuon duoc, giu nut dang xuat luon hien de khong bi ket.
export function AppSidebarShell({ title, items, header, children }: AppSidebarShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <Link href="/" className="truncate text-sm font-semibold">
              Hotel Booking
            </Link>
            <span className="truncate text-xs text-sidebar-foreground/60">{title}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="shrink-0 md:hidden" aria-label="Đăng xuất">
            <LogOut className="size-4" />
          </Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible md:px-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-sidebar-border p-3 md:block">
          <p className="truncate text-sm text-sidebar-foreground/80">{user?.full_name}</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start gap-2 px-2" onClick={handleLogout}>
            <LogOut className="size-4" />
            Đăng xuất
          </Button>
        </div>
      </aside>
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
          {header}
          {children}
        </div>
      </div>
    </div>
  );
}
