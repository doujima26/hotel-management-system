"use client";

import { useState } from "react";
import { Slider } from "@base-ui/react/slider";
import { Star } from "lucide-react";
import { formatMoney } from "@/lib/utils/format";
import { useSearchTransition } from "@/components/shared/SearchTransition";
import type { HotelSearchFilters } from "@/types/models";

// Khoang gia thanh keo ngan sach: 0 -> 20 trieu, buoc 100k. Keo toi 20 trieu
// coi nhu khong gioi han tren (hien dau "+", khong gui max_price).
const PRICE_MIN = 0;
const PRICE_MAX = 20000000;
const PRICE_STEP = 100000;

// Cac muc diem danh gia - gia tri gui di cung la thang 10 nhu nhan hien thi.
const RATING_OPTIONS = [
  { label: "Tuyệt vời: 9+", value: "9" },
  { label: "Rất tốt: 8+", value: "8" },
  { label: "Tốt: 7+", value: "7" },
  { label: "Dễ chịu: 6+", value: "6" },
];

const STAR_OPTIONS = [5, 4, 3, 2, 1];

interface HotelFilterSidebarProps {
  facets: HotelSearchFilters;
  // Cac param luon giu lai khi doi bo loc (city, check_in, sort...).
  baseParams: Record<string, string>;
  selectedStars: number[];
  selectedDistricts: string[];
  selectedAmenities: string[];
  selectedRoomAmenities: string[];
  selectedServices: string[];
  minRating: string;
  minPrice: string;
  maxPrice: string;
  hasPromotion: boolean;
}

interface NavigateOverrides {
  stars?: number[];
  districts?: string[];
  amenities?: string[];
  roomAmenities?: string[];
  services?: string[];
  minRating?: string;
  minPrice?: string;
  maxPrice?: string;
  hasPromotion?: boolean;
}

// Sidebar loc ket qua tim kiem - client component vi dieu huong URL. Trang thai
// bo loc lay truc tiep tu URL (qua prop), moi thay doi build lai URL va push,
// reset ve trang 1 (khong dua "page" vao baseParams).
export function HotelFilterSidebar({
  facets,
  baseParams,
  selectedStars,
  selectedDistricts,
  selectedAmenities,
  selectedRoomAmenities,
  selectedServices,
  minRating,
  minPrice,
  maxPrice,
  hasPromotion,
}: HotelFilterSidebarProps) {
  const { navigate: pushHref } = useSearchTransition();
  const [priceRange, setPriceRange] = useState<number[]>([
    minPrice ? Number(minPrice) : PRICE_MIN,
    maxPrice ? Number(maxPrice) : PRICE_MAX,
  ]);

  function navigate(overrides: NavigateOverrides) {
    const stars = overrides.stars ?? selectedStars;
    const districts = overrides.districts ?? selectedDistricts;
    const amenities = overrides.amenities ?? selectedAmenities;
    const roomAmenities = overrides.roomAmenities ?? selectedRoomAmenities;
    const services = overrides.services ?? selectedServices;
    const rating = overrides.minRating ?? minRating;
    const priceMin = overrides.minPrice ?? minPrice;
    const priceMax = overrides.maxPrice ?? maxPrice;
    const promo = overrides.hasPromotion ?? hasPromotion;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(baseParams)) {
      if (value) params.set(key, value);
    }
    stars.forEach((s) => params.append("stars", String(s)));
    districts.forEach((d) => params.append("districts", d));
    amenities.forEach((a) => params.append("amenities", a));
    roomAmenities.forEach((a) => params.append("room_amenities", a));
    services.forEach((s) => params.append("services", s));
    if (rating) params.set("min_rating", rating);
    if (priceMin) params.set("min_price", priceMin);
    if (priceMax) params.set("max_price", priceMax);
    if (promo) params.set("has_promotion", "true");

    const query = params.toString();
    pushHref(query ? `/hotels?${query}` : "/hotels");
  }

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  // Keo xong (commit) thi tim ngay: gia 0 -> bo min_price, gia toi da -> bo
  // max_price (khong gioi han tren).
  function commitPrice(range: number[]) {
    const [low, high] = range;
    navigate({
      minPrice: low > PRICE_MIN ? String(low) : "",
      maxPrice: high < PRICE_MAX ? String(high) : "",
    });
  }

  const hasActiveFilter =
    selectedStars.length > 0 ||
    selectedDistricts.length > 0 ||
    selectedAmenities.length > 0 ||
    selectedRoomAmenities.length > 0 ||
    selectedServices.length > 0 ||
    Boolean(minRating) ||
    Boolean(minPrice) ||
    Boolean(maxPrice) ||
    hasPromotion;

  return (
    <aside className="flex flex-col gap-5 rounded-xl border p-4 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Lọc theo</p>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => pushHref(`/hotels?${new URLSearchParams(baseParams).toString()}`)}
            className="text-xs text-primary hover:underline"
          >
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Ngan sach moi dem - thanh keo 2 diem, keo xong tim ngay */}
      <div className="flex flex-col gap-2">
        <p className="font-medium">Ngân sách (mỗi đêm)</p>
        <p className="text-xs text-muted-foreground">
          {formatMoney(priceRange[0])} - {formatMoney(priceRange[1])}
          {priceRange[1] >= PRICE_MAX ? "+" : ""}
        </p>
        <Slider.Root
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as number[])}
          onValueCommitted={(value) => commitPrice(value as number[])}
        >
          <Slider.Control className="relative flex w-full touch-none items-center py-2 select-none">
            <Slider.Track className="h-1.5 w-full rounded-full bg-muted">
              <Slider.Indicator className="rounded-full bg-primary" />
              <Slider.Thumb
                index={0}
                getAriaLabel={() => "Giá tối thiểu"}
                className="size-4 rounded-full border-2 border-primary bg-background shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Slider.Thumb
                index={1}
                getAriaLabel={() => "Giá tối đa"}
                className="size-4 rounded-full border-2 border-primary bg-background shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
      </div>

      {/* Hang sao */}
      <div className="flex flex-col gap-2">
        <p className="font-medium">Hạng sao</p>
        {STAR_OPTIONS.map((n) => (
          <label key={n} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={selectedStars.includes(n)}
              onChange={() => navigate({ stars: toggle(selectedStars, n) })}
            />
            <span className="flex items-center gap-0.5">
              {Array.from({ length: n }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-primary text-primary" />
              ))}
            </span>
          </label>
        ))}
      </div>

      {/* Diem danh gia */}
      <div className="flex flex-col gap-2">
        <p className="font-medium">Điểm đánh giá</p>
        {RATING_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={minRating === opt.value}
              onChange={() => navigate({ minRating: minRating === opt.value ? "" : opt.value })}
            />
            {opt.label}
          </label>
        ))}
      </div>

      {/* Quan / Khu vuc */}
      {facets.districts.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-medium">Quận / Khu vực</p>
          {facets.districts.map((district) => (
            <label key={district} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={selectedDistricts.includes(district)}
                onChange={() => navigate({ districts: toggle(selectedDistricts, district) })}
              />
              {district}
            </label>
          ))}
        </div>
      )}

      {/* Tien nghi chung khach san */}
      {facets.amenities.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-medium">Tiện nghi</p>
          {facets.amenities.map((amenity) => (
            <label key={amenity.name} className="flex cursor-pointer items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={selectedAmenities.includes(amenity.name)}
                  onChange={() => navigate({ amenities: toggle(selectedAmenities, amenity.name) })}
                />
                {amenity.name}
              </span>
              <span className="text-xs text-muted-foreground">{amenity.count}</span>
            </label>
          ))}
        </div>
      )}

      {/* Tien nghi rieng loai phong */}
      {facets.room_amenities.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-medium">Tiện nghi phòng</p>
          {facets.room_amenities.map((amenity) => (
            <label key={amenity.name} className="flex cursor-pointer items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={selectedRoomAmenities.includes(amenity.name)}
                  onChange={() => navigate({ roomAmenities: toggle(selectedRoomAmenities, amenity.name) })}
                />
                {amenity.name}
              </span>
              <span className="text-xs text-muted-foreground">{amenity.count}</span>
            </label>
          ))}
        </div>
      )}

      {/* Dich vu */}
      {facets.services.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-medium">Dịch vụ</p>
          {facets.services.map((service) => (
            <label key={service} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={selectedServices.includes(service)}
                onChange={() => navigate({ services: toggle(selectedServices, service) })}
              />
              {service}
            </label>
          ))}
        </div>
      )}

      {/* Uu dai */}
      <div className="flex flex-col gap-2">
        <p className="font-medium">Ưu đãi</p>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={hasPromotion}
            onChange={() => navigate({ hasPromotion: !hasPromotion })}
          />
          Đang có khuyến mãi
        </label>
      </div>
    </aside>
  );
}
