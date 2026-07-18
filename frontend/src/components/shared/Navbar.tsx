"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/auth/session";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, isHydrated } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          Hotel Booking
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/hotels" className="text-muted-foreground hover:text-foreground">
            Tìm khách sạn
          </Link>
          {isHydrated && user ? (
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
              <Link href="/account" className="text-muted-foreground hover:text-foreground">
                Tài khoản
              </Link>
              <span className="text-muted-foreground">{user.full_name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Đăng xuất
              </Button>
            </>
          ) : (
            isHydrated && (
              <>
                <Link href="/login" className="text-muted-foreground hover:text-foreground">
                  Đăng nhập
                </Link>
                <Link href="/register" className={cn(buttonVariants({ size: "sm" }))}>
                  Đăng ký
                </Link>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
