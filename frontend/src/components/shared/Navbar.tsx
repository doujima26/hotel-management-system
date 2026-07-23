"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/auth/session";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Cac khu vuc co side-rail rieng (AppSidebarShell) - Navbar chung khong hien o day,
// tru /admin/register van la trang cong khai de dang ky tai khoan chu khach san.
const APP_SHELL_PREFIXES = ["/staff", "/super-admin"];

// Thanh nav don gian, full-width, khong noi/bo tron (theo yeu cau nguoi dung -
// thay the ban N5 floating pill truoc do).
export function Navbar() {
  const { user, isHydrated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    logout();
    router.push("/");
  }

  const isAdminShell = pathname.startsWith("/admin") && pathname !== "/admin/register";
  if (isAdminShell || APP_SHELL_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <header className="bg-primary text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight text-white">
          Hotel Booking
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {isHydrated && user && (
            <>
              {user.role === "super_admin" && (
                <Link href="/super-admin/hotels" className="text-white/80 hover:text-white">
                  Quản trị
                </Link>
              )}
              {user.role === "admin" && (
                <Link href="/admin/hotel-profile" className="text-white/80 hover:text-white">
                  Quản lý khách sạn
                </Link>
              )}
              {user.role === "staff" && (
                <Link href="/staff/bookings" className="text-white/80 hover:text-white">
                  Vận hành
                </Link>
              )}
              {user.role === "user" && (
                <>
                  <Link href="/bookings" className="text-white/80 hover:text-white">
                    Booking của tôi
                  </Link>
                  <Link href="/account/wishlist" className="text-white/80 hover:text-white">
                    Yêu thích
                  </Link>
                </>
              )}
              <Link href="/account" className="max-w-24 truncate text-white/80 hover:text-white">
                {user.full_name}
              </Link>
            </>
          )}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          {isHydrated &&
            (user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                aria-label="Đăng xuất"
                className="text-white hover:bg-white/15 hover:text-white"
              >
                <LogOut className="size-4" />
              </Button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-white/70 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/15"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
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
