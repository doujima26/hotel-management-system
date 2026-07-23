"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/utils/format";
import type { HotelSearchFilters } from "@/types/models";

// Cac muc diem danh gia: nhan thang 10 (giong Booking) -> gia tri gui la thang 5 sao.
const RATING_OPTIONS = [
  { label: "Tuyệt vời: 9+", value: "4.5" },
  { label: "Rất tốt: 8+", value: "4" },
  { label: "Tốt: 7+", value: "3.5" },
  { label: "Dễ chịu: 6+", value: "3" },
];

const STAR_OPTIONS = [5, 4, 3, 2, 1];

interface HotelFilterSidebarProps {
  facets: HotelSearchFilters;
  // Cac param luon giu lai khi doi bo loc (city, check_in, sort...).
  baseParams: Record<string, string>;
  selectedStars: number[];
  selectedDistricts: string[];
  selectedAmenities: string[];
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
  selectedServices,
  minRating,
  minPrice,
  maxPrice,
  hasPromotion,
}: HotelFilterSidebarProps) {
  const router = useRouter();
  const [priceFrom, setPriceFrom] = useState(minPrice);
  const [priceTo, setPriceTo] = useState(maxPrice);

  function navigate(overrides: NavigateOverrides) {
    const stars = overrides.stars ?? selectedStars;
    const districts = overrides.districts ?? selectedDistricts;
    const amenities = overrides.amenities ?? selectedAmenities;
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
    services.forEach((s) => params.append("services", s));
    if (rating) params.set("min_rating", rating);
    if (priceMin) params.set("min_price", priceMin);
    if (priceMax) params.set("max_price", priceMax);
    if (promo) params.set("has_promotion", "true");

    const query = params.toString();
    router.push(query ? `/hotels?${query}` : "/hotels");
  }

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  const hasActiveFilter =
    selectedStars.length > 0 ||
    selectedDistricts.length > 0 ||
    selectedAmenities.length > 0 ||
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
            onClick={() => router.push(`/hotels?${new URLSearchParams(baseParams).toString()}`)}
            className="text-xs text-primary hover:underline"
          >
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Ngan sach moi dem */}
      <div className="flex flex-col gap-2">
        <p className="font-medium">Ngân sách (mỗi đêm)</p>
        {facets.price_min != null && facets.price_max != null && (
          <p className="text-xs text-muted-foreground">
            {formatMoney(facets.price_min)} - {formatMoney(facets.price_max)}
          </p>
        )}
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="price_from" className="text-xs text-muted-foreground">
              Từ
            </Label>
            <Input
              id="price_from"
              type="number"
              min={0}
              inputMode="numeric"
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.currentTarget.value)}
              onBlur={() => priceFrom !== minPrice && navigate({ minPrice: priceFrom })}
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="price_to" className="text-xs text-muted-foreground">
              Đến
            </Label>
            <Input
              id="price_to"
              type="number"
              min={0}
              inputMode="numeric"
              value={priceTo}
              onChange={(e) => setPriceTo(e.currentTarget.value)}
              onBlur={() => priceTo !== maxPrice && navigate({ maxPrice: priceTo })}
              className="h-9"
            />
          </div>
        </div>
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

      {/* Tien nghi */}
      {facets.amenities.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-medium">Tiện nghi</p>
          {facets.amenities.map((amenity) => (
            <label key={amenity} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={selectedAmenities.includes(amenity)}
                onChange={() => navigate({ amenities: toggle(selectedAmenities, amenity) })}
              />
              {amenity}
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
