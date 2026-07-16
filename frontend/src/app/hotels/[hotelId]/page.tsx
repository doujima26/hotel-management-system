import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils/format";
import { hotelsApi } from "@/lib/api/hotels";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";

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
        {err instanceof ApiError ? err.message : "Khong tim thay khach san"}
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
      availabilityError = err instanceof ApiError ? err.message : "Khong the tai tinh trang phong trong";
    }
  }

  const primaryImage = hotel.images.find((img) => img.is_primary) ?? hotel.images[0];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <Link href="/hotels" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Quay lai tim kiem
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
        <h1 className="text-2xl font-semibold">{hotel.name}</h1>
        <p className="text-muted-foreground">
          {hotel.address}, {hotel.district ? `${hotel.district}, ` : ""}
          {hotel.city}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hotel.star_rating ? `${hotel.star_rating} sao - ` : ""}
          {hotel.avg_rating.toFixed(1)} / 5 ({hotel.total_reviews} danh gia)
        </p>
        {hotel.description && <p className="mt-3 text-sm">{hotel.description}</p>}
      </div>

      <Separator />

      <form className="grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="check_in">Nhan phong</Label>
          <Input id="check_in" name="check_in" type="date" defaultValue={checkIn} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="check_out">Tra phong</Label>
          <Input id="check_out" name="check_out" type="date" defaultValue={checkOut} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="num_guests">So khach</Label>
          <Input id="num_guests" name="num_guests" type="number" min={1} defaultValue={numGuests} />
        </div>
        <Button type="submit" className="self-end">
          Xem phong trong
        </Button>
      </form>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Loai phong</h2>

        {!hasDateRange && (
          <p className="text-sm text-muted-foreground">Chon ngay nhan/tra phong de xem phong con trong va gia.</p>
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
                      <span className="font-semibold">{formatMoney(room.base_price)}/dem</span>
                    </div>
                    <CardDescription>Toi da {room.max_guests} khach/phong</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {canBook ? `Con trong ${room.available_rooms}/${room.total_rooms} phong` : "Het phong trong"}
                    </span>
                    {canBook ? (
                      <Link
                        href={`/checkout/${id}?${bookQs.toString()}`}
                        className={cn(buttonVariants({ size: "sm" }))}
                      >
                        Dat phong
                      </Link>
                    ) : (
                      <Button size="sm" disabled>
                        Het phong
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {availability.items.length === 0 && (
              <p className="text-center text-muted-foreground">Khach san chua co loai phong nao.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
