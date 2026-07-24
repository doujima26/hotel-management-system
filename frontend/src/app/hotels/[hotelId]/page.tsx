import Link from "next/link";
import { BedDouble, Check, Clock, CreditCard, Maximize2, PawPrint, Star, Users } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { HotelSearchForm } from "@/components/shared/HotelSearchForm";
import { HotelDetailSearchForm } from "@/components/shared/HotelDetailSearchForm";
import { HotelGallery } from "@/components/shared/HotelGallery";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney, getRatingLabel, toTenPointScore } from "@/lib/utils/format";
import { hotelsApi } from "@/lib/api/hotels";
import { roomsApi } from "@/lib/api/rooms";
import { reviewsApi } from "@/lib/api/reviews";
import { ApiError } from "@/types/api";
import { PAYMENT_METHOD_LABELS } from "@/types/enums";
import type { Review } from "@/types/models";

interface HotelDetailPageProps {
  params: Promise<{ hotelId: string }>;
  searchParams: Promise<{ check_in?: string; check_out?: string; num_guests?: string }>;
}

export default async function HotelDetailPage({ params, searchParams }: HotelDetailPageProps) {
  const { hotelId } = await params;
  const query = await searchParams;
  const checkIn = query.check_in ?? "";
  const checkOut = query.check_out ?? "";
  const numGuests = query.num_guests ?? "";
  const id = Number(hotelId);

  let hotel;
  try {
    hotel = await hotelsApi.getDetail(id);
  } catch (err) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-destructive">
        {err instanceof ApiError ? err.message : "Không tìm thấy khách sạn"}
      </div>
    );
  }

  const hasDateRange = Boolean(checkIn && checkOut);
  let availability: Awaited<ReturnType<typeof roomsApi.availability>> | null = null;
  let availabilityError: string | null = null;
  if (hasDateRange) {
    try {
      availability = await roomsApi.availability({
        hotel_id: id,
        check_in: checkIn,
        check_out: checkOut,
        num_guests: numGuests ? Number(numGuests) : undefined,
      });
    } catch (err) {
      availabilityError = err instanceof ApiError ? err.message : "Không thể tải tình trạng phòng trống";
    }
  }

  let reviews: Review[] = [];
  try {
    reviews = await reviewsApi.listForHotel(id);
  } catch {
    reviews = [];
  }

  const score = hotel.total_reviews > 0 ? toTenPointScore(hotel.avg_rating) : null;
  const fromPrice =
    availability && availability.items.length > 0 ? Math.min(...availability.items.map((r) => r.base_price)) : null;

  // Phan bo so luong danh gia theo tung muc sao (tinh tu reviews da lay).
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  // Nhom tien nghi theo category + them nhom "Dich vu" tu services.
  const amenityGroups = new Map<string, string[]>();
  for (const amenity of hotel.amenities) {
    const key = amenity.category || "Khác";
    if (!amenityGroups.has(key)) amenityGroups.set(key, []);
    amenityGroups.get(key)!.push(amenity.name);
  }
  const facilityGroups: [string, string[]][] = [...amenityGroups.entries()];
  if (hotel.services.length > 0) facilityGroups.push(["Dịch vụ", hotel.services]);

  return (
    <div className="flex flex-col">
      {/* Thanh tim kiem tong - luon co tren trang chi tiet */}
      <div className="border-b bg-muted/30">
        <div className="mx-auto w-full max-w-5xl px-4 py-4">
          <HotelSearchForm
            defaultCity={hotel.city}
            defaultCheckIn={checkIn}
            defaultCheckOut={checkOut}
            defaultNumGuests={numGuests}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Trang chủ
          </Link>
          {" › "}
          <Link href={`/hotels?city=${encodeURIComponent(hotel.city)}`} className="hover:text-foreground">
            {hotel.city}
          </Link>
          {" › "}
          <span className="text-foreground">{hotel.name}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{hotel.name}</h1>
            {hotel.star_rating && (
              <div className="mt-1 flex gap-0.5">
                {Array.from({ length: hotel.star_rating }).map((_, i) => (
                  <Star key={i} className="size-4 fill-primary text-primary" />
                ))}
              </div>
            )}
            <p className="mt-1.5 text-sm text-muted-foreground">
              {hotel.address}, {hotel.district ? `${hotel.district}, ` : ""}
              {hotel.city}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <FavoriteButton hotelId={id} />
            {score != null && (
              <div className="flex items-center gap-2">
                <span className="flex h-9 min-w-9 items-center justify-center rounded-md bg-primary px-2 text-sm font-bold text-primary-foreground">
                  {score.toFixed(1)}
                </span>
                <div className="text-xs">
                  <p className="font-semibold">{getRatingLabel(score)}</p>
                  <p className="text-muted-foreground">{hotel.total_reviews} đánh giá</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gallery */}
        <HotelGallery images={hotel.images} hotelName={hotel.name} />

        {/* 2 cot: mo ta + tien nghi noi bat | card dat phong */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
          <div className="flex flex-col gap-4">
            {hotel.description && (
              <div>
                <h2 className="mb-2 text-lg font-semibold">Giới thiệu</h2>
                <p className="text-sm leading-relaxed">{hotel.description}</p>
              </div>
            )}
            {hotel.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hotel.amenities.slice(0, 8).map((amenity) => (
                  <span
                    key={amenity.name}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm"
                  >
                    <Check className="size-4 text-primary" />
                    {amenity.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <aside className="rounded-xl border p-4 shadow-sm lg:sticky lg:top-4">
            {fromPrice != null ? (
              <>
                <p className="text-sm text-muted-foreground">Chỉ từ</p>
                <p className="text-2xl font-bold">
                  {formatMoney(fromPrice)} <span className="text-sm font-normal text-muted-foreground">/ đêm</span>
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Chọn ngày nhận/trả phòng để xem giá.</p>
            )}
            {score != null && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted p-2.5">
                <span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-primary px-1.5 text-sm font-bold text-primary-foreground">
                  {score.toFixed(1)}
                </span>
                <div className="text-xs">
                  <p className="font-semibold">{getRatingLabel(score)}</p>
                  <p className="text-muted-foreground">{hotel.total_reviews} đánh giá</p>
                </div>
              </div>
            )}
            <Link href="#rooms" className={cn(buttonVariants(), "mt-4 w-full rounded-full")}>
              Chọn phòng
            </Link>
            <ul className="mt-4 flex flex-col gap-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-primary" /> Xác nhận đặt phòng tức thì
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-primary" /> Giá đã gồm thuế &amp; phí
              </li>
            </ul>
          </aside>
        </div>

        <Separator />

        {/* Phong trong */}
        <section id="rooms" className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Phòng trống</h2>
          <HotelDetailSearchForm defaultCheckIn={checkIn} defaultCheckOut={checkOut} defaultNumGuests={numGuests} />

          {!hasDateRange && (
            <p className="text-sm text-muted-foreground">Chọn ngày nhận/trả phòng để xem phòng còn trống và giá.</p>
          )}
          {availabilityError && <p className="text-sm text-destructive">{availabilityError}</p>}

          {availability && (
            <div className="flex flex-col gap-3">
              {availability.items.map((room) => {
                const bookQs = new URLSearchParams({
                  room_type_id: String(room.room_type_id),
                  check_in: checkIn,
                  check_out: checkOut,
                });
                if (numGuests) bookQs.set("num_guests", numGuests);
                const canBook = room.available_rooms > 0;
                return (
                  <div
                    key={room.room_type_id}
                    className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{room.name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {room.bed_type && (
                          <span className="flex items-center gap-1.5">
                            <BedDouble className="size-4" /> {room.bed_type}
                          </span>
                        )}
                        {room.area_sqm && (
                          <span className="flex items-center gap-1.5">
                            <Maximize2 className="size-4" /> {room.area_sqm} m²
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Users className="size-4" /> Tối đa {room.max_guests} khách
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        {canBook ? `Còn trống ${room.available_rooms}/${room.total_rooms} phòng` : "Hết phòng trống"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatMoney(room.base_price)}</p>
                        <p className="text-xs text-muted-foreground">mỗi đêm</p>
                      </div>
                      {canBook ? (
                        <Link
                          href={`/checkout/${id}?${bookQs.toString()}`}
                          className={cn(buttonVariants({ size: "sm" }), "rounded-full")}
                        >
                          Đặt phòng
                        </Link>
                      ) : (
                        <Button size="sm" disabled className="rounded-full">
                          Hết phòng
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {availability.items.length === 0 && (
                <p className="text-center text-muted-foreground">Khách sạn chưa có loại phòng nào.</p>
              )}
            </div>
          )}
        </section>

        <Separator />

        {/* Danh gia */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Đánh giá của khách</h2>
          {score == null ? (
            <p className="text-sm text-muted-foreground">Chưa có đánh giá nào.</p>
          ) : (
            <>
              <div className="grid gap-6 rounded-xl border p-5 sm:grid-cols-[auto_1fr]">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">{score.toFixed(1)}</p>
                  <p className="font-semibold">{getRatingLabel(score)}</p>
                  <p className="text-sm text-muted-foreground">{hotel.total_reviews} đánh giá</p>
                </div>
                <div className="flex flex-col justify-center gap-2">
                  {ratingBreakdown.map(({ star, count }) => (
                    <div key={star} className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{star} sao</span>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-right text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {reviews.slice(0, 6).map((review) => (
                  <div key={review.id} className="rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-muted font-semibold text-primary">
                        {review.reviewer_name.charAt(0).toUpperCase()}
                      </span>
                      <div className="mr-auto">
                        <p className="text-sm font-medium">{review.reviewer_name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
                      </div>
                      <span className="rounded-md bg-primary px-2 py-0.5 text-sm font-bold text-primary-foreground">
                        {toTenPointScore(review.rating).toFixed(1)}
                      </span>
                    </div>
                    {review.comment && <p className="mt-2.5 text-sm">{review.comment}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Tien nghi & dich vu */}
        {facilityGroups.length > 0 && (
          <>
            <Separator />
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Tiện nghi &amp; dịch vụ</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {facilityGroups.map(([category, names]) => (
                  <div key={category}>
                    <h3 className="mb-2 font-medium">{category}</h3>
                    <ul className="flex flex-col gap-1.5">
                      {names.map((name) => (
                        <li key={name} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="size-4 shrink-0 text-primary" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <Separator />

        {/* Quy tac chung */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Quy tắc chung</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <Clock className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Nhận phòng</span>
              <span className="ml-auto font-medium">Từ {hotel.check_in_time.slice(0, 5)}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <Clock className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Trả phòng</span>
              <span className="ml-auto font-medium">Trước {hotel.check_out_time.slice(0, 5)}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <PawPrint className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Thú cưng</span>
              <span className="ml-auto font-medium">{hotel.pets_allowed ? "Cho phép" : "Không cho phép"}</span>
            </div>
            {hotel.payment_methods.length > 0 && (
              <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Thanh toán</span>
                <span className="ml-auto text-right font-medium">
                  {hotel.payment_methods.map((method) => PAYMENT_METHOD_LABELS[method]).join(", ")}
                </span>
              </div>
            )}
          </div>
          {hotel.cancellation_policy && (
            <div className="text-sm">
              <p className="font-medium">Chính sách hủy phòng</p>
              <p className="text-muted-foreground">{hotel.cancellation_policy}</p>
            </div>
          )}
          {hotel.children_policy && (
            <div className="text-sm">
              <p className="font-medium">Chính sách trẻ em</p>
              <p className="text-muted-foreground">{hotel.children_policy}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
