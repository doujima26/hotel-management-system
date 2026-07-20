import Link from "next/link";
import { Star } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { HotelDetailSearchForm } from "@/components/shared/HotelDetailSearchForm";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { hotelsApi } from "@/lib/api/hotels";
import { roomsApi } from "@/lib/api/rooms";
import { reviewsApi } from "@/lib/api/reviews";
import { ApiError } from "@/types/api";
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

  const primaryImage = hotel.images.find((img) => img.is_primary) ?? hotel.images[0];

  let reviews: Review[] = [];
  try {
    reviews = await reviewsApi.listForHotel(id);
  } catch {
    reviews = [];
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <Link href="/hotels" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Quay lại tìm kiếm
        </Link>
      </div>

      {primaryImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={primaryImage.image_url}
          alt={hotel.name}
          className="h-64 w-full rounded-xl object-cover"
        />
      )}

      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold">{hotel.name}</h1>
          <FavoriteButton hotelId={id} />
        </div>
        <p className="text-muted-foreground">
          {hotel.address}, {hotel.district ? `${hotel.district}, ` : ""}
          {hotel.city}
        </p>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          {hotel.star_rating ? `${hotel.star_rating} sao - ` : ""}
          <Star className="size-3.5 fill-primary text-primary" />
          {hotel.avg_rating.toFixed(1)} / 5 ({hotel.total_reviews} đánh giá)
        </p>
        {hotel.description && <p className="mt-3 text-sm">{hotel.description}</p>}
      </div>

      <Separator />

      <HotelDetailSearchForm defaultCheckIn={checkIn} defaultCheckOut={checkOut} defaultNumGuests={numGuests} />

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Loại phòng</h2>

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
                <Card key={room.room_type_id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{room.name}</CardTitle>
                      <span className="font-semibold">{formatMoney(room.base_price)}/đêm</span>
                    </div>
                    <CardDescription>Tối đa {room.max_guests} khách/phòng</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {canBook ? `Còn trống ${room.available_rooms}/${room.total_rooms} phòng` : "Hết phòng trống"}
                    </span>
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
                  </CardContent>
                </Card>
              );
            })}
            {availability.items.length === 0 && (
              <p className="text-center text-muted-foreground">Khách sạn chưa có loại phòng nào.</p>
            )}
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Đánh giá từ khách hàng</h2>
        {reviews.length === 0 && <p className="text-sm text-muted-foreground">Chưa có đánh giá nào.</p>}
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{review.reviewer_name}</CardTitle>
                <span className="text-sm font-medium">{review.rating} / 5</span>
              </div>
              <CardDescription>{formatDate(review.created_at)}</CardDescription>
            </CardHeader>
            {review.comment && (
              <CardContent>
                <p className="text-sm">{review.comment}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
