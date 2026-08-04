"use client";

import { useQuery } from "@tanstack/react-query";
import { HotelHighlightScroller } from "@/components/shared/HotelHighlightScroller";
import { useAuth } from "@/hooks/useAuth";
import { hotelsApi } from "@/lib/api/hotels";

// Muc goi y dat lai o trang chu. Chi khach hang dang dang nhap moi co du lieu
// nay nen phai goi tu phia trinh duyet, khac cac muc con lai cua trang chu.
// Khong dang nhap, chua tung dat, hoac loi tai thi khong render gi.
export function RecentlyBookedSection() {
  const { isAuthenticated, isHydrated, user } = useAuth();
  const laKhachHang = isAuthenticated && user?.role === "user";

  const { data: hotels } = useQuery({
    queryKey: ["recently-booked-hotels"],
    queryFn: () => hotelsApi.listRecentlyBookedHotels(15),
    enabled: isHydrated && laKhachHang,
  });

  if (!hotels || hotels.length === 0) return null;

  return (
    <section>
      <div className="mx-auto w-full max-w-6xl px-4 pb-16">
        <HotelHighlightScroller
          title="Đặt lại nơi bạn từng ở"
          subtitle="Những khách sạn bạn đã đặt trước đây, đặt lại chỉ với vài bước"
          items={hotels}
        />
      </div>
    </section>
  );
}
