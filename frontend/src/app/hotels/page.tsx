import Link from "next/link";
import { Building2, Check, Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBedConfig, formatMoney, getRatingLabel } from "@/lib/utils/format";
import { hotelsApi } from "@/lib/api/hotels";
import { ApiError } from "@/types/api";
import { HotelSearchForm } from "@/components/shared/HotelSearchForm";
import { HotelSortSelect } from "@/components/shared/HotelSortSelect";
import { HotelFilterSidebar } from "@/components/shared/HotelFilterSidebar";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { SearchTransitionProvider, SearchTransitionPending } from "@/components/shared/SearchTransition";
import type { HotelSearchFilters } from "@/types/models";

interface HotelsPageProps {
  searchParams: Promise<{
    city?: string;
    check_in?: string;
    check_out?: string;
    num_guests?: string;
    sort?: string;
    min_price?: string;
    max_price?: string;
    min_rating?: string;
    has_promotion?: string;
    stars?: string | string[];
    districts?: string | string[];
    amenities?: string | string[];
    room_amenities?: string | string[];
    services?: string | string[];
    page?: string;
  }>;
}

// Chuyen param URL (co the la chuoi hoac mang khi lap lai) ve mang.
function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

const EMPTY_FACETS: HotelSearchFilters = {
  price_min: null,
  price_max: null,
  districts: [],
  amenities: [],
  room_amenities: [],
  services: [],
};

export default async function HotelsPage({ searchParams }: HotelsPageProps) {
  const params = await searchParams;
  const city = params.city ?? "";
  const checkIn = params.check_in ?? "";
  const checkOut = params.check_out ?? "";
  const numGuests = params.num_guests ?? "";
  const sort = params.sort ?? "recommended";
  const minPrice = params.min_price ?? "";
  const maxPrice = params.max_price ?? "";
  const minRating = params.min_rating ?? "";
  const hasPromotion = params.has_promotion === "true";
  const stars = toArray(params.stars);
  const districts = toArray(params.districts);
  const amenities = toArray(params.amenities);
  const roomAmenities = toArray(params.room_amenities);
  const services = toArray(params.services);
  const page = Number(params.page ?? "1") || 1;

  let errorMessage: string | null = null;
  let result: Awaited<ReturnType<typeof hotelsApi.search>> | null = null;
  let facets: HotelSearchFilters = EMPTY_FACETS;
  const [searchResult, facetsResult] = await Promise.allSettled([
    hotelsApi.search({
      city: city || undefined,
      check_in: checkIn || undefined,
      check_out: checkOut || undefined,
      num_guests: numGuests ? Number(numGuests) : undefined,
      sort: sort !== "recommended" ? sort : undefined,
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
      min_rating: minRating ? Number(minRating) : undefined,
      stars: stars.length ? stars.map(Number) : undefined,
      districts: districts.length ? districts : undefined,
      amenities: amenities.length ? amenities : undefined,
      room_amenities: roomAmenities.length ? roomAmenities : undefined,
      services: services.length ? services : undefined,
      has_promotion: hasPromotion || undefined,
      page,
      page_size: 10,
    }),
    hotelsApi.getSearchFilters({
      city: city || undefined,
      check_in: checkIn || undefined,
      check_out: checkOut || undefined,
      num_guests: numGuests ? Number(numGuests) : undefined,
    }),
  ]);
  if (searchResult.status === "fulfilled") {
    result = searchResult.value;
  } else {
    errorMessage =
      searchResult.reason instanceof ApiError ? searchResult.reason.message : "Không thể tải danh sách khách sạn";
  }
  if (facetsResult.status === "fulfilled") {
    facets = facetsResult.value;
  }

  // Cac param loc hien tai (khong gom sort/page) - dung cho sort va phan trang
  // giu nguyen bo loc; dang mang cap de giu duoc param lap lai.
  function filterEntries(): [string, string][] {
    const entries: [string, string][] = [];
    if (city) entries.push(["city", city]);
    if (checkIn) entries.push(["check_in", checkIn]);
    if (checkOut) entries.push(["check_out", checkOut]);
    if (numGuests) entries.push(["num_guests", numGuests]);
    if (minPrice) entries.push(["min_price", minPrice]);
    if (maxPrice) entries.push(["max_price", maxPrice]);
    if (minRating) entries.push(["min_rating", minRating]);
    if (hasPromotion) entries.push(["has_promotion", "true"]);
    stars.forEach((s) => entries.push(["stars", s]));
    districts.forEach((d) => entries.push(["districts", d]));
    amenities.forEach((a) => entries.push(["amenities", a]));
    roomAmenities.forEach((a) => entries.push(["room_amenities", a]));
    services.forEach((s) => entries.push(["services", s]));
    return entries;
  }

  // Cac param giu lai khi doi bo loc o sidebar (city/ngay/khach/sort, don gia tri).
  const baseParams: Record<string, string> = {
    ...(city ? { city } : {}),
    ...(checkIn ? { check_in: checkIn } : {}),
    ...(checkOut ? { check_out: checkOut } : {}),
    ...(numGuests ? { num_guests: numGuests } : {}),
    ...(sort !== "recommended" ? { sort } : {}),
  };

  function buildPageHref(targetPage: number) {
    const qs = new URLSearchParams(filterEntries());
    if (sort !== "recommended") qs.set("sort", sort);
    qs.set("page", String(targetPage));
    return `/hotels?${qs.toString()}`;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <HotelSearchForm
        defaultCity={city}
        defaultCheckIn={checkIn}
        defaultCheckOut={checkOut}
        defaultNumGuests={numGuests}
      />

      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Trang chủ
        </Link>
        {city && (
          <>
            {" › "}
            <span>{city}</span>
          </>
        )}
        {" › "}
        <span className="text-foreground">Kết quả tìm kiếm</span>
      </nav>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      {result && (
        <SearchTransitionProvider>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="lg:w-64 lg:shrink-0">
            <HotelFilterSidebar
              facets={facets}
              baseParams={baseParams}
              selectedStars={stars.map(Number)}
              selectedDistricts={districts}
              selectedAmenities={amenities}
              selectedRoomAmenities={roomAmenities}
              selectedServices={services}
              minRating={minRating}
              minPrice={minPrice}
              maxPrice={maxPrice}
              hasPromotion={hasPromotion}
            />
          </div>

          <SearchTransitionPending>
          <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Tìm thấy {result.total} khách sạn</p>
            <HotelSortSelect value={sort} preserved={filterEntries()} />
          </div>
          <div className="flex flex-col gap-4">
            {result.items.map((hotel) => {
              const detailQs = new URLSearchParams();
              if (checkIn) detailQs.set("check_in", checkIn);
              if (checkOut) detailQs.set("check_out", checkOut);
              if (numGuests) detailQs.set("num_guests", numGuests);
              const suffix = detailQs.toString();
              const detailHref = `/hotels/${hotel.id}${suffix ? `?${suffix}` : ""}`;
              const score = hotel.total_reviews > 0 ? hotel.avg_rating : null;
              const highlights = [...hotel.room_amenities, ...hotel.hotel_service_names];

              return (
                <div
                  key={hotel.id}
                  className="flex flex-col gap-4 rounded-xl border p-3 transition-colors hover:border-primary/40 sm:flex-row sm:p-4"
                >
                  <div className="relative h-44 w-full shrink-0 sm:h-auto sm:w-56">
                    <Link href={detailHref} className="block h-full w-full overflow-hidden rounded-lg bg-muted">
                      {hotel.primary_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- URL anh tuy y (admin dan), khong khai bao truoc duoc remotePatterns cho next/image
                        <img src={hotel.primary_image_url} alt={hotel.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Building2 className="size-8" />
                        </div>
                      )}
                    </Link>
                    <div className="absolute top-2 right-2">
                      <FavoriteButton hotelId={hotel.id} variant="icon" />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link href={detailHref} className="font-semibold text-primary hover:underline">
                          {hotel.name}
                        </Link>
                        {hotel.star_rating && (
                          <div className="mt-0.5 flex gap-0.5">
                            {Array.from({ length: hotel.star_rating }).map((_, i) => (
                              <Star key={i} className="size-3.5 fill-primary text-primary" />
                            ))}
                          </div>
                        )}
                        <p className="mt-1 text-sm text-muted-foreground">
                          {hotel.district ? `${hotel.district}, ` : ""}
                          {hotel.city}
                        </p>
                      </div>

                      {score != null && (
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-primary px-1.5 text-sm font-bold text-primary-foreground">
                            {score.toFixed(1)}
                          </span>
                          <div className="text-xs">
                            <p className="font-semibold">{getRatingLabel(score)}</p>
                            <p className="text-muted-foreground">{hotel.total_reviews} đánh giá</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {hotel.promotion_name && (
                      <span className="inline-flex w-fit items-center rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {hotel.promotion_name}
                      </span>
                    )}

                    {hotel.room_type_name && (
                      <div className="rounded-lg border bg-muted/30 p-2.5">
                        <p className="text-sm font-medium">{hotel.room_type_name}</p>
                        {formatBedConfig(hotel.bed_type, hotel.bed_count) && (
                          <p className="text-xs text-muted-foreground">
                            {formatBedConfig(hotel.bed_type, hotel.bed_count)}
                          </p>
                        )}
                        {highlights.length > 0 && (
                          <ul className="mt-1.5 flex flex-col gap-1">
                            {highlights.slice(0, 4).map((label) => (
                              <li key={label} className="flex items-center gap-1.5 text-xs text-green-700">
                                <Check className="size-3.5 shrink-0" />
                                {label}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-end justify-between gap-3">
                      {score == null && <p className="text-xs text-muted-foreground">Chưa có đánh giá</p>}

                      <div className="ml-auto flex items-end gap-3">
                        {hotel.total_price != null && (
                          <div className="text-right">
                            {hotel.num_nights != null && (
                              <p className="text-xs text-muted-foreground">
                                {hotel.num_nights} đêm{numGuests ? `, ${numGuests} người lớn` : ""}
                              </p>
                            )}
                            {hotel.discounted_total_price != null && hotel.discount_percent ? (
                              <>
                                <p className="text-xs text-muted-foreground line-through">{formatMoney(hotel.total_price)}</p>
                                <p className="text-lg font-bold text-primary">{formatMoney(hotel.discounted_total_price)}</p>
                              </>
                            ) : (
                              <p className="text-lg font-bold">{formatMoney(hotel.total_price)}</p>
                            )}
                            {hotel.num_nights == null && <p className="text-xs text-muted-foreground">mỗi đêm</p>}
                          </div>
                        )}
                        <Link href={detailHref} className={cn(buttonVariants({ size: "sm" }), "rounded-full")}>
                          Xem chỗ trống
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {result.items.length === 0 && (
              <p className="text-center text-muted-foreground">Không tìm thấy khách sạn phù hợp.</p>
            )}
          </div>

          {result.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Link
                href={buildPageHref(Math.max(1, page - 1))}
                aria-disabled={page <= 1}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-50")}
              >
                Trước
              </Link>
              <span className="text-sm text-muted-foreground">
                Trang {result.page} / {result.total_pages}
              </span>
              <Link
                href={buildPageHref(Math.min(result.total_pages, page + 1))}
                aria-disabled={page >= result.total_pages}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  page >= result.total_pages && "pointer-events-none opacity-50"
                )}
              >
                Sau
              </Link>
            </div>
          )}
          </div>
          </SearchTransitionPending>
        </div>
        </SearchTransitionProvider>
      )}
    </div>
  );
}
