import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const POPULAR_CITIES = ["Hà Nội", "Đà Nẵng", "TP. Hồ Chí Minh", "Nha Trang", "Đà Lạt"];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-4 py-12 md:grid-cols-12 md:gap-8 md:py-20">
        <div className="flex flex-col gap-4 md:col-span-5">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Tìm khách sạn phù hợp với bạn
          </h1>
          <p className="max-w-sm text-muted-foreground">
            So sánh giá theo ngày, xem đánh giá thật từ khách đã ở, đặt phòng và thanh toán chỉ trong vài bước.
          </p>
        </div>

        <form
          action="/hotels"
          method="GET"
          className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-lg md:col-span-7 md:p-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="city">Thành phố</Label>
              <Input id="city" name="city" placeholder="Ví dụ: Đà Nẵng" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="check_in">Nhận phòng</Label>
              <Input id="check_in" name="check_in" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="check_out">Trả phòng</Label>
              <Input id="check_out" name="check_out" type="date" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="num_guests">Số khách</Label>
              <Input id="num_guests" name="num_guests" type="number" min={1} placeholder="2" />
            </div>
          </div>
          <Button type="submit" size="lg" className="rounded-full">
            Tìm kiếm
          </Button>
        </form>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-6">
          <span className="text-sm text-muted-foreground">Điểm đến phổ biến:</span>
          {POPULAR_CITIES.map((city) => (
            <Link
              key={city}
              href={`/hotels?city=${encodeURIComponent(city)}`}
              className="rounded-full border bg-background px-3.5 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary"
            >
              {city}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
