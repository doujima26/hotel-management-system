"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/enums";

// Bao ve route phia client. LUU Y: day chi la UX guard, KHONG phai ranh gioi bao
// mat that su - backend (require_roles()) moi la noi thuc su chan quyen truy cap.
export function RequireAuth({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const { user, isHydrated, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user && !allow.includes(user.role)) {
      router.replace("/");
    }
  }, [isHydrated, isAuthenticated, user, allow, router, pathname]);

  if (!isHydrated) {
    return <div className="p-8 text-center text-muted-foreground">Đang tải...</div>;
  }
  if (!isAuthenticated || (user && !allow.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
}
