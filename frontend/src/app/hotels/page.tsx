import Link from "next/link";
import { Building2, Check, Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney, getRatingLabel, toTenPointScore } from "@/lib/utils/format";
import { hotelsApi } from "@/lib/api/hotels";
import { ApiError } from "@/types/api";
import { HotelSearchForm } from "@/components/shared/HotelSearchForm";
import { FavoriteButton } from "@/components/shared/FavoriteButton";

interface HotelsPageProps {
  searchParams: Promise<{
    city?: string;
    check_in?: string;
    check_out?: string;
    num_guests?: string;
    page?: string;
  }>;
}

export default async function HotelsPage({ searchParams }: HotelsPageProps) {
  const params = await searchParams;
  const city = params.city ?? "";
  const checkIn = params.check_in ?? "";
  const checkOut = params.check_out ?? "";
  const numGuests = params.num_guests ?? "";
  const page = Number(params.page ?? "1") || 1;

  let errorMessage: string | null = null;
  let result: Awaited<ReturnType<typeof hotelsApi.search>> | null = null;
  try {
    result = await hotelsApi.search({
      city: city || undefined,
      check_in: checkIn || undefined,
      check_out: checkOut || undefined,
      num_guests: numGuests ? Number(numGuests) : undefined,
      page,
      page_size: 10,
    });
  } catch (err) {
    errorMessage = err instanceof ApiError ? err.message : "Không thể tải danh sách khách sạn";
  }

  function buildPageHref(targetPage: number) {
    const qs = new URLSearchParams();
    if (city) qs.set("city", city);
    if (checkIn) qs.set("check_in", checkIn);
    if (checkOut) qs.set("check_out", checkOut);
    if (numGuests) qs.set("num_guests", numGuests);
    qs.set("page", String(targetPage));
    return `/hotels?${qs.toString()}`;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <HotelSearchForm
        defaultCity={city}
        defaultCheckIn={checkIn}
        defaultCheckOut={checkOut}
        defaultNumGuests={numGuests}
      />

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      {result && (
        <>
          <p className="text-sm text-muted-foreground">Tìm thấy {result.total} khách sạn</p>
          <div className="flex flex-col gap-4">
            {result.items.map((hotel) => {
              const detailQs = new URLSearchParams();
              if (checkIn) detailQs.set("check_in", checkIn);
              if (checkOut) detailQs.set("check_out", checkOut);
              if (numGuests) detailQs.set("num_guests", numGuests);
              const suffix = detailQs.toString();
              const detailHref = `/hotels/${hotel.id}${suffix ? `?${suffix}` : ""}`;
              const score = hotel.total_reviews > 0 ? toTenPointScore(hotel.avg_rating) : null;
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
                        {hotel.bed_type && <p className="text-xs text-muted-foreground">Giường {hotel.bed_type}</p>}
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
        </>
      )}
    </div>
  );
}
