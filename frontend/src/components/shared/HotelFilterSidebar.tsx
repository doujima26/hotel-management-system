"use client";

import { useEffect, useRef, useState } from "react";
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

// Dong bo state cuc bo theo prop khi prop that su doi (URL doi tu ben ngoai:
// Xoa tat ca, doi thanh pho, back/forward) - chinh state ngay trong luc render
// thay vi qua useEffect, dung mau "adjusting state when a prop changes" cua
// React de tranh render thua. So sanh theo isEqual (khong phai tham chieu) vi
// component cha tao mang moi moi lan render du gia tri khong doi.
function useSyncedState<T>(
  propValue: T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState(propValue);
  const [prevProp, setPrevProp] = useState(propValue);
  if (!isEqual(propValue, prevProp)) {
    setPrevProp(propValue);
    setValue(propValue);
  }
  return [value, setValue];
}

// So sanh 2 mang chon loc khong phan biet thu tu (toggle co the doi vi tri).
function sameItems<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item));
}

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

// Gop nhieu lan tich lien tiep thanh 1 lan tim, tranh reload ket qua sau moi
// cai tich rieng le.
const DEBOUNCE_MS = 500;

// Sidebar loc ket qua tim kiem - client component vi dieu huong URL. Cac o tich
// (sao, quan, tien nghi, dich vu, diem danh gia, uu dai) giu 1 ban sao trang
// thai cuc bo de phan hoi ngay khi bam, con dieu huong URL thuc su thi gom lai
// sau DEBOUNCE_MS ke tu lan tich cuoi. Rieng gia keo xong la tim ngay (khong
// can gom, vi tha tay chuot da la 1 hanh dong ro rang).
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
  const { navigate: pushHref, isPending } = useSearchTransition();
  const [priceRange, setPriceRange] = useState<number[]>([
    minPrice ? Number(minPrice) : PRICE_MIN,
    maxPrice ? Number(maxPrice) : PRICE_MAX,
  ]);

  const [stars, setStars] = useSyncedState(selectedStars, sameItems);
  const [districts, setDistricts] = useSyncedState(selectedDistricts, sameItems);
  const [amenities, setAmenities] = useSyncedState(selectedAmenities, sameItems);
  const [roomAmenities, setRoomAmenities] = useSyncedState(selectedRoomAmenities, sameItems);
  const [services, setServices] = useSyncedState(selectedServices, sameItems);
  const [rating, setRating] = useSyncedState(minRating);
  const [promo, setPromo] = useSyncedState(hasPromotion);

  function buildHref(overrides: { minPrice?: string; maxPrice?: string } = {}) {
    const priceMin = overrides.minPrice ?? minPrice;
    const priceMax = overrides.maxPrice ?? maxPrice;

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
    return query ? `/hotels?${query}` : "/hotels";
  }

  // Bo qua lan chay dau (mount) - chi gom va dieu huong khi cac o tich thuc su
  // doi do nguoi dung bam. Neu dang co 1 lan dieu huong khac chay (isPending),
  // khong gui chong len - doi no xong, effect nay tu chay lai (isPending doi
  // thanh false cung nam trong dependency). So voi lastSentHref de biet co gi
  // thuc su moi khong gui - tranh vong lap gui lai chinh URL vua gui xong moi
  // khi isPending tat.
  const isFirstRender = useRef(true);
  const lastSentHref = useRef<string | null>(null);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastSentHref.current = buildHref();
      return;
    }
    if (isPending) return;
    const timer = setTimeout(() => {
      const href = buildHref();
      if (href === lastSentHref.current) return;
      lastSentHref.current = href;
      pushHref(href);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stars, districts, amenities, roomAmenities, services, rating, promo, isPending]);

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  // Keo xong (commit) thi tim ngay: gia 0 -> bo min_price, gia toi da -> bo
  // max_price (khong gioi han tren).
  function commitPrice(range: number[]) {
    const [low, high] = range;
    const href = buildHref({
      minPrice: low > PRICE_MIN ? String(low) : "",
      maxPrice: high < PRICE_MAX ? String(high) : "",
    });
    lastSentHref.current = href;
    pushHref(href);
  }

  function clearAll() {
    setStars([]);
    setDistricts([]);
    setAmenities([]);
    setRoomAmenities([]);
    setServices([]);
    setRating("");
    setPromo(false);
    const href = `/hotels?${new URLSearchParams(baseParams).toString()}`;
    lastSentHref.current = href;
    pushHref(href);
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
          <button type="button" onClick={clearAll} className="text-xs text-primary hover:underline">
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
              checked={stars.includes(n)}
              onChange={() => setStars(toggle(stars, n))}
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
              checked={rating === opt.value}
              onChange={() => setRating(rating === opt.value ? "" : opt.value)}
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
                checked={districts.includes(district)}
                onChange={() => setDistricts(toggle(districts, district))}
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
                  checked={amenities.includes(amenity.name)}
                  onChange={() => setAmenities(toggle(amenities, amenity.name))}
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
                  checked={roomAmenities.includes(amenity.name)}
                  onChange={() => setRoomAmenities(toggle(roomAmenities, amenity.name))}
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
                checked={services.includes(service)}
                onChange={() => setServices(toggle(services, service))}
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
            checked={promo}
            onChange={() => setPromo(!promo)}
          />
          Đang có khuyến mãi
        </label>
      </div>
    </aside>
  );
}
