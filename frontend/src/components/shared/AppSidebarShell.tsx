"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  href: string;
  label: string;
  // So luong can chu y (vd booking cho xu ly) - hien badge do canh muc.
  badgeCount?: number;
}

// Nhom cac muc theo chuc nang (co tieu de nhom). Neu truyen mang phang thi
// khong hien tieu de - giu tuong thich cho Staff/Super Admin.
export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

interface AppSidebarShellProps {
  title: string;
  items: SidebarItem[] | SidebarGroup[];
  header?: React.ReactNode;
  children: React.ReactNode;
}

function isGrouped(items: SidebarItem[] | SidebarGroup[]): items is SidebarGroup[] {
  return items.length > 0 && "items" in items[0];
}

function flatten(items: SidebarItem[] | SidebarGroup[]): SidebarItem[] {
  return isGrouped(items) ? items.flatMap((group) => group.items) : items;
}

// Chi to sang MOT muc: chon muc co href khop dai nhat voi duong dan hien tai.
// Neu chi dung startsWith thi "/admin/staff" se sang cung "/admin/staff/schedule".
function findActiveHref(items: SidebarItem[] | SidebarGroup[], pathname: string): string | null {
  return flatten(items)
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .reduce<string | null>((longest, item) => (!longest || item.href.length > longest.length ? item.href : longest), null);
}

// Khung side-rail dung chung cho khu vuc Admin/Staff/Super Admin - thay the
// Navbar chung o cac trang nay. Tren mobile rut gon thanh thanh ngang cuon
// duoc, giu nut dang xuat luon hien de khong bi ket.
export function AppSidebarShell({ title, items, header, children }: AppSidebarShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const activeHref = findActiveHref(items, pathname);

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
          {isGrouped(items)
            ? items.map((group) => (
                <div key={group.label} className="flex shrink-0 gap-1 md:mt-3 md:flex-col md:first:mt-0">
                  {/* Tieu de nhom chi hien tren desktop - mobile la thanh ngang cuon. */}
                  <p className="hidden px-3 pb-1 text-[11px] font-semibold tracking-wide text-sidebar-foreground/50 uppercase md:block">
                    {group.label}
                  </p>
                  {group.items.map((item) => (
                    <SidebarLink key={item.href} item={item} activeHref={activeHref} />
                  ))}
                </div>
              ))
            : items.map((item) => <SidebarLink key={item.href} item={item} activeHref={activeHref} />)}
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

// 1 muc trong sidebar, kem badge so luong can chu y neu co.
function SidebarLink({ item, activeHref }: { item: SidebarItem; activeHref: string | null }) {
  const active = item.href === activeHref;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      {item.label}
      {item.badgeCount != null && item.badgeCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-white">
          {item.badgeCount > 99 ? "99+" : item.badgeCount}
        </span>
      )}
    </Link>
  );
}
