"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { User } from "@/types/models";

// Cac khu vuc co side-rail rieng (AppSidebarShell) - Navbar chung khong hien o day,
// tru /admin/register van la trang cong khai de dang ky tai khoan chu khach san.
const APP_SHELL_PREFIXES = ["/staff", "/super-admin"];

// Link vao khu vuc quan ly rieng theo vai tro (khong ap dung cho khach thuong).
const ROLE_LINKS: Record<string, { href: string; label: string }> = {
  super_admin: { href: "/super-admin/hotels", label: "Quản trị nền tảng" },
  admin: { href: "/admin/dashboard", label: "Quản lý khách sạn" },
  staff: { href: "/staff/bookings", label: "Vận hành" },
};

// Thanh nav don gian, full-width, nen cam chu trang.
export function Navbar() {
  const { user, isHydrated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    logout();
    router.push("/");
  }

  // Bam "Dang nhap"/"Dang ky" khi dang dung ngay trang do
  // khong doi URL nen Next khong remount lai form - phai tai
  // lai trang de reset ve dung form goc.
  function handleSamePageAuthClick(href: string) {
    return (e: ReactMouseEvent) => {
      e.preventDefault();
      window.location.href = href;
    };
  }

  const isAdminShell = pathname.startsWith("/admin") && pathname !== "/admin/register";
  if (isAdminShell || APP_SHELL_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <header className="bg-primary text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-white">
          Hotel Booking
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {isHydrated &&
            (user ? (
              <UserMenu user={user} onLogout={handleLogout} />
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={pathname === "/login" ? handleSamePageAuthClick("/login") : undefined}
                  className={cn(buttonVariants({ size: "sm" }), "rounded-full bg-white text-primary hover:bg-white/90")}
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  onClick={pathname === "/register" ? handleSamePageAuthClick("/register") : undefined}
                  className={cn(buttonVariants({ size: "sm" }), "rounded-full bg-white text-primary hover:bg-white/90")}
                >
                  Đăng ký
                </Link>
              </>
            ))}
        </div>
      </div>
    </header>
  );
}

// Dropdown "Tai khoan" thay cho cac link dieu huong roi rac tron navbar.
function UserMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const roleLink = ROLE_LINKS[user.role];
  const items = [
    { href: "/account", label: "Thông tin cá nhân", icon: UserIcon },
    { href: "/account/security", label: "Cài đặt bảo mật", icon: ShieldCheck },
    { href: "/account/wishlist", label: "Yêu thích", icon: Heart },
    { href: "/bookings", label: "Đơn đặt phòng", icon: CalendarCheck },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-white hover:bg-white/15"
      >
        <span className="flex size-8 items-center justify-center overflow-hidden rounded-full border border-white/50 bg-white/20 text-sm font-semibold">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            user.full_name.charAt(0).toUpperCase()
          )}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{user.full_name}</span>
        <ChevronDown className="size-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="border-b px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.full_name}</p>
            <p className="text-xs text-muted-foreground">Tài khoản</p>
          </div>
          {roleLink && (
            <>
              <MenuLink href={roleLink.href} icon={LayoutDashboard} onNavigate={() => setOpen(false)}>
                {roleLink.label}
              </MenuLink>
              <div className="h-px bg-border" />
            </>
          )}
          {items.map(({ href, label, icon }) => (
            <MenuLink key={label} href={href} icon={icon} onNavigate={() => setOpen(false)}>
              {label}
            </MenuLink>
          ))}
          <div className="h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-destructive hover:bg-muted"
          >
            <LogOut className="size-4" /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  onNavigate,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      role="menuitem"
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      {children}
    </Link>
  );
}
