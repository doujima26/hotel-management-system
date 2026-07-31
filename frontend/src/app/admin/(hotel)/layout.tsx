"use client";

import { createContext, useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { AppSidebarShell, type SidebarGroup } from "@/components/shared/AppSidebarShell";
import { HotelStatusBadge } from "@/components/shared/StatusBadge";
import { hotelsApi } from "@/lib/api/hotels";
import { bookingsApi } from "@/lib/api/bookings";
import { ApiError } from "@/types/api";
import type { AdminHotel } from "@/types/models";

const AdminHotelContext = createContext<AdminHotel | null>(null);

// Dung trong cac trang con de lay hotel_id/status cua khach san admin dang quan ly.
export function useAdminHotel(): AdminHotel {
  const hotel = useContext(AdminHotelContext);
  if (!hotel) {
    throw new Error("useAdminHotel phải được gọi bên trong AdminHotelLayout sau khi đã có khách sạn");
  }
  return hotel;
}

// Gom theo nhom cong viec thay vi de phang. Thu tu nhom di theo tan suat dung:
// viec lam hang ngay (van hanh) len tren, phan thiet lap mot lan (co so luu tru,
// nhan su) xuong duoi.
function buildNavGroups(pendingBookings: number): SidebarGroup[] {
  return [
    // Trang mo dau ngay lam viec - dat rieng dau menu, khong thuoc nhom nao.
    { items: [{ href: "/admin/dashboard", label: "Tổng quan" }] },
    {
      label: "Vận hành",
      items: [
        { href: "/admin/bookings", label: "Đơn đặt phòng", badgeCount: pendingBookings },
        { href: "/admin/rooms", label: "Sơ đồ phòng" },
        { href: "/admin/room-blocks", label: "Khóa lịch phòng" },
      ],
    },
    {
      label: "Kinh doanh",
      items: [
        { href: "/admin/revenue", label: "Doanh thu" },
        // "Lich trong phong" chu khong phai "Lich phong": phan biet ro voi
        // "Khoa lich phong" ben Van hanh - 2 ten cu gan trung nhau nen de nham.
        { href: "/admin/calendar", label: "Lịch trống phòng" },
        { href: "/admin/promotions", label: "Khuyến mãi" },
        { href: "/admin/reviews", label: "Đánh giá" },
      ],
    },
    {
      label: "Cơ sở lưu trú",
      items: [
        { href: "/admin/hotel-profile", label: "Hồ sơ khách sạn" },
        { href: "/admin/room-types", label: "Loại phòng" },
        { href: "/admin/amenities", label: "Tiện nghi" },
        { href: "/admin/services", label: "Dịch vụ" },
      ],
    },
    {
      label: "Nhân sự",
      items: [
        { href: "/admin/staff", label: "Nhân viên" },
        { href: "/admin/staff/schedule", label: "Lịch làm việc" },
      ],
    },
  ];
}

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

  // Dem booking dang cho xac nhan de hien badge canh muc "Booking" (muc 6.6).
  const { data: pendingBookings } = useQuery({
    queryKey: ["hotel-bookings", "pending"],
    queryFn: () => bookingsApi.listForHotel("pending"),
    // Chi dem khi khach san con van hanh (da duyet hoac dang tam dung).
    enabled: hotel?.status === "approved" || hotel?.status === "suspended",
  });

  useEffect(() => {
    if (isLoading) return;
    if (noHotelYet && pathname !== "/admin/onboarding") {
      router.replace("/admin/onboarding");
    }
    if (hotel && pathname === "/admin/onboarding") {
      router.replace("/admin/dashboard");
    }
  }, [isLoading, noHotelYet, hotel, pathname, router]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Đang tải...</div>;
  }

  if (noHotelYet) {
    // Neu dang o dung /admin/onboarding thi render form (children). Neu khong,
    // useEffect ben tren se redirect sang do - trong luc cho, khong render {children}
    // vi trang dich hien tai (vd hotel-profile) can useAdminHotel() va se crash.
    if (pathname === "/admin/onboarding") {
      return <div className="mx-auto max-w-2xl px-4 py-8">{children}</div>;
    }
    return <div className="p-8 text-center text-muted-foreground">Đang chuyển hướng...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-destructive">
        {error instanceof ApiError ? error.message : "Không thể tải thông tin khách sạn"}
      </div>
    );
  }

  if (!hotel) {
    return null;
  }

  const statusBanner = (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{hotel.name}</h1>
        <HotelStatusBadge status={hotel.status} />
      </div>
      {hotel.status === "pending" && (
        <p className="mt-1 text-sm text-muted-foreground">
          Khách sạn đang chờ Super Admin duyệt. Sau khi duyệt, bạn mới tạo được loại phòng, tiện nghi, dịch vụ,
          khuyến mãi và ảnh.
        </p>
      )}
      {hotel.status === "rejected" && (
        <p className="mt-1 text-sm text-destructive">
          Khách sạn bị từ chối{hotel.rejection_reason ? `: ${hotel.rejection_reason}` : "."} Vui lòng cập nhật thông
          tin và liên hệ quản trị viên.
        </p>
      )}
      {hotel.status === "suspended" && (
        <p className="mt-1 text-sm text-destructive">
          Khách sạn đang bị tạm dừng bởi quản trị viên
          {hotel.rejection_reason ? `: ${hotel.rejection_reason}` : "."} Bạn vẫn phục vụ được các đơn đã đặt, nhưng
          khách sạn không nhận đơn mới và không sửa được phòng, giá, khuyến mãi.
        </p>
      )}
    </div>
  );

  return (
    <AdminHotelContext.Provider value={hotel}>
      <AppSidebarShell
        title="Quản lý khách sạn"
        items={buildNavGroups(pendingBookings?.length ?? 0)}
        header={statusBanner}
      >
        {children}
      </AppSidebarShell>
    </AdminHotelContext.Provider>
  );
}
