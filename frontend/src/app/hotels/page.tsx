import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { hotelsApi } from "@/lib/api/hotels";
import { ApiError } from "@/types/api";

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
    errorMessage = err instanceof ApiError ? err.message : "Khong the tai danh sach khach san";
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
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <form
        action="/hotels"
        method="GET"
        className="grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Thanh pho</Label>
          <Input id="city" name="city" defaultValue={city} placeholder="Vi du: Da Nang" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="check_in">Nhan phong</Label>
          <Input id="check_in" name="check_in" type="date" defaultValue={checkIn} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="check_out">Tra phong</Label>
          <Input id="check_out" name="check_out" type="date" defaultValue={checkOut} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="num_guests">So khach</Label>
          <Input id="num_guests" name="num_guests" type="number" min={1} defaultValue={numGuests} />
        </div>
        <Button type="submit" className="self-end">
          Tim kiem
        </Button>
      </form>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      {result && (
        <>
          <p className="text-sm text-muted-foreground">Tim thay {result.total} khach san</p>
          <div className="flex flex-col gap-4">
            {result.items.map((hotel) => {
              const detailQs = new URLSearchParams();
              if (checkIn) detailQs.set("check_in", checkIn);
              if (checkOut) detailQs.set("check_out", checkOut);
              if (numGuests) detailQs.set("num_guests", numGuests);
              const suffix = detailQs.toString();
              const detailHref = `/hotels/${hotel.id}${suffix ? `?${suffix}` : ""}`;
              return (
                <Link key={hotel.id} href={detailHref}>
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{hotel.name}</CardTitle>
                        {hotel.star_rating && <Badge variant="secondary">{hotel.star_rating} sao</Badge>}
                      </div>
                      <CardDescription>
                        {hotel.address}, {hotel.district ? `${hotel.district}, ` : ""}
                        {hotel.city}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {hotel.avg_rating.toFixed(1)} / 5 ({hotel.total_reviews} danh gia)
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            {result.items.length === 0 && (
              <p className="text-center text-muted-foreground">Khong tim thay khach san phu hop.</p>
            )}
          </div>

          {result.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Link
                href={buildPageHref(Math.max(1, page - 1))}
                aria-disabled={page <= 1}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-50")}
              >
                Truoc
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
