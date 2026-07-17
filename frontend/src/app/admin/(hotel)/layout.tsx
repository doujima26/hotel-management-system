"use client";

import { createContext, useContext, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { hotelsApi } from "@/lib/api/hotels";
import { ApiError } from "@/types/api";
import { HOTEL_STATUS_LABELS } from "@/types/enums";
import type { AdminHotel } from "@/types/models";

const AdminHotelContext = createContext<AdminHotel | null>(null);

// Dung trong cac trang con de lay hotel_id/status cua khach san admin dang quan ly.
export function useAdminHotel(): AdminHotel {
  const hotel = useContext(AdminHotelContext);
  if (!hotel) {
    throw new Error("useAdminHotel phai duoc goi ben trong AdminHotelLayout sau khi da co khach san");
  }
  return hotel;
}

const TABS = [
  { href: "/admin/hotel-profile", label: "Ho so khach san" },
  { href: "/admin/room-types", label: "Loai phong" },
  { href: "/admin/amenities", label: "Tien nghi" },
  { href: "/admin/services", label: "Dich vu" },
  { href: "/admin/promotions", label: "Khuyen mai" },
];

export default function AdminHotelLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth allow={["admin"]}>
      <AdminHotelGate>{children}</AdminHotelGate>
    </RequireAuth>
  );
}

function AdminHotelGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const { data: hotel, isLoading, error } = useQuery({
    queryKey: ["my-hotel"],
    queryFn: () => hotelsApi.getMine(),
    retry: false,
  });

  const noHotelYet = error instanceof ApiError && error.status === 400;

  useEffect(() => {
    if (isLoading) return;
    if (noHotelYet && pathname !== "/admin/onboarding") {
      router.replace("/admin/onboarding");
    }
    if (hotel && pathname === "/admin/onboarding") {
      router.replace("/admin/hotel-profile");
    }
  }, [isLoading, noHotelYet, hotel, pathname, router]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Dang tai...</div>;
  }

  if (noHotelYet) {
    return <div className="mx-auto max-w-2xl px-4 py-8">{children}</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-destructive">
        {error instanceof ApiError ? error.message : "Khong the tai thong tin khach san"}
      </div>
    );
  }

  if (!hotel) {
    return null;
  }

  return (
    <AdminHotelContext.Provider value={hotel}>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">{hotel.name}</h1>
            <Badge variant={hotel.status === "rejected" || hotel.status === "suspended" ? "destructive" : "secondary"}>
              {HOTEL_STATUS_LABELS[hotel.status]}
            </Badge>
          </div>
          {hotel.status === "pending" && (
            <p className="mt-1 text-sm text-muted-foreground">
              Khach san dang cho Super Admin duyet. Sau khi duyet, ban moi tao duoc loai phong, tien nghi, dich vu,
              khuyen mai va anh.
            </p>
          )}
          {hotel.status === "rejected" && (
            <p className="mt-1 text-sm text-destructive">
              Khach san bi tu choi{hotel.rejection_reason ? `: ${hotel.rejection_reason}` : "."} Vui long cap nhat
              thong tin va lien he quan tri vien.
            </p>
          )}
          {hotel.status === "suspended" && (
            <p className="mt-1 text-sm text-destructive">Khach san dang bi tam dung hoat dong boi quan tri vien.</p>
          )}
          <nav className="mt-4 flex flex-wrap gap-2 border-b pb-2">
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
    </AdminHotelContext.Provider>
  );
}
