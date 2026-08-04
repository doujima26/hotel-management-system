"use client";

import { createContext, useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { AppSidebarShell, type SidebarGroup, type SidebarItem } from "@/components/shared/AppSidebarShell";
import { HotelStatusBadge } from "@/components/shared/StatusBadge";
import { hotelsApi } from "@/lib/api/hotels";
import { bookingsApi } from "@/lib/api/bookings";
import { ApiError } from "@/types/api";
import type { HotelStatus } from "@/types/enums";
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

// Khach san con van hanh duoc: xem so lieu, phuc vu don da dat, xep ca.
// Khach san tam dung van thuoc nhom nay.
export function canOperate(status: HotelStatus): boolean {
  return status === "approved" || status === "suspended";
}

// Khach san duoc sua noi dung rao ban: loai phong, gia, khuyen mai, dich vu, anh.
export function canEditListing(status: HotelStatus): boolean {
  return status === "approved";
}

// Cau giai thich vi sao khong sua duoc, phan biet chua duyet voi dang tam dung.
export function listingLockMessage(status: HotelStatus, action: string): string {
  return status === "suspended"
    ? `Khách sạn đang bị tạm dừng nên không ${action} được.`
    : `Khách sạn cần được duyệt trước khi ${action}.`;
}

// Gom theo nhom cong viec thay vi de phang. Thu tu nhom di theo tan suat dung:
// viec lam hang ngay (van hanh) len tren, phan thiet lap mot lan (co so luu tru,
// nhan su) xuong duoi.
//
// Khach san chua duyet va khach san tam dung khac nhau: chua duyet thi chua co
// don nao nen moi muc deu chua dung duoc, con tam dung thi van xem va van hanh
// binh thuong nen khong khoa muc nao.
function buildNavGroups(pendingBookings: number, status: HotelStatus): SidebarGroup[] {
  const locked = status === "pending" || status === "rejected";
  const lock = (item: SidebarItem): SidebarItem =>
    locked
      ? { ...item, disabled: true, disabledHint: "Khách sạn cần được duyệt trước khi dùng mục này" }
      : item;

  return [
    // Trang mo dau ngay lam viec - dat rieng dau menu, khong thuoc nhom nao.
    { items: [lock({ href: "/admin/dashboard", label: "Tổng quan" })] },
    {
      label: "Vận hành",
      items: [
        lock({ href: "/admin/bookings", label: "Đơn đặt phòng", badgeCount: pendingBookings }),
        lock({ href: "/admin/rooms", label: "Sơ đồ phòng" }),
        lock({ href: "/admin/room-blocks", label: "Khóa lịch phòng" }),
      ],
    },
    {
      label: "Kinh doanh",
      items: [
        lock({ href: "/admin/revenue", label: "Doanh thu" }),
        // "Lich trong phong" chu khong phai "Lich phong": phan biet ro voi
        // "Khoa lich phong" ben Van hanh - 2 ten cu gan trung nhau nen de nham.
        lock({ href: "/admin/calendar", label: "Lịch trống phòng" }),
        lock({ href: "/admin/pricing", label: "Giá phòng" }),
        lock({ href: "/admin/promotions", label: "Khuyến mãi" }),
        lock({ href: "/admin/reviews", label: "Đánh giá" }),
      ],
    },
    {
      label: "Cơ sở lưu trú",
      items: [
        // Muc duy nhat khong khoa: chua duyet thi van phai sua duoc ho so de
        // bo sung thong tin roi gui duyet lai.
        { href: "/admin/hotel-profile", label: "Hồ sơ khách sạn" },
        lock({ href: "/admin/room-types", label: "Loại phòng" }),
        lock({ href: "/admin/amenities", label: "Tiện nghi" }),
        lock({ href: "/admin/services", label: "Dịch vụ" }),
      ],
    },
    {
      label: "Nhân sự",
      items: [
        lock({ href: "/admin/staff", label: "Nhân viên" }),
        lock({ href: "/admin/staff/schedule", label: "Lịch làm việc" }),
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
    enabled: hotel ? canOperate(hotel.status) : false,
  });

  useEffect(() => {
    if (isLoading) return;
    if (noHotelYet && pathname !== "/admin/onboarding") {
      router.replace("/admin/onboarding");
    }
    if (hotel && pathname === "/admin/onboarding") {
      // Khach san chua duyet chua co so lieu nao de xem, dua ve ho so de bo sung
      // thong tin thay vi dua vao trang tong quan rong.
      const landing =
        hotel.status === "pending" || hotel.status === "rejected" ? "/admin/hotel-profile" : "/admin/dashboard";
      router.replace(landing);
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
          {hotel.rejection_reason ? ` với lý do: ${hotel.rejection_reason}.` : "."} Bạn vẫn xem được mọi thông tin và
          phục vụ các đơn đã đặt, nhưng khách sạn không nhận đơn mới và không sửa được phòng, giá, khuyến mãi.
        </p>
      )}
    </div>
  );

  return (
    <AdminHotelContext.Provider value={hotel}>
      <AppSidebarShell
        title="Quản lý khách sạn"
        items={buildNavGroups(pendingBookings?.length ?? 0, hotel.status)}
        header={statusBanner}
      >
        {children}
      </AppSidebarShell>
    </AdminHotelContext.Provider>
  );
}
