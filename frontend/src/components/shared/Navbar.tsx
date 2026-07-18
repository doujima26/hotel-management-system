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

// N5 Floating pill (DESIGN.md) - noi cach mep tren, bo tron, blur nen. Tren man
// hinh hep, pill wrap xuong nhieu dong thay vi an bot lien ket - du dang chua co
// menu hamburger rieng nen khong the danh mat chuc nang tren mobile.
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
    <>
      <header className="fixed inset-x-0 top-3 z-20 flex justify-center px-3">
        <div className="flex w-fit max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-3xl border bg-background/85 px-4 py-2 shadow-lg backdrop-blur-md sm:flex-nowrap sm:rounded-full">
          <Link href="/" className="shrink-0 text-sm font-semibold tracking-tight">
            Hotel Booking
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
            <Link href="/hotels" className="text-muted-foreground hover:text-foreground">
              Tìm khách sạn
            </Link>
            {isHydrated && user && (
              <>
                {user.role === "super_admin" && (
                  <Link href="/super-admin/hotels" className="text-muted-foreground hover:text-foreground">
                    Quản trị
                  </Link>
                )}
                {user.role === "admin" && (
                  <Link href="/admin/hotel-profile" className="text-muted-foreground hover:text-foreground">
                    Quản lý khách sạn
                  </Link>
                )}
                {user.role === "staff" && (
                  <Link href="/staff/bookings" className="text-muted-foreground hover:text-foreground">
                    Vận hành
                  </Link>
                )}
                {user.role === "user" && (
                  <>
                    <Link href="/bookings" className="text-muted-foreground hover:text-foreground">
                      Booking của tôi
                    </Link>
                    <Link href="/account/wishlist" className="text-muted-foreground hover:text-foreground">
                      Yêu thích
                    </Link>
                  </>
                )}
                <Link href="/account" className="max-w-24 truncate text-muted-foreground hover:text-foreground">
                  {user.full_name}
                </Link>
              </>
            )}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {isHydrated &&
              (user ? (
                <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Đăng xuất">
                  <LogOut className="size-4" />
                </Button>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                    Đăng nhập
                  </Link>
                  <Link href="/register" className={cn(buttonVariants({ size: "sm" }), "rounded-full")}>
                    Đăng ký
                  </Link>
                </>
              ))}
          </div>
        </div>
      </header>
      <div className="h-24 sm:h-16" aria-hidden />
    </>
  );
}
