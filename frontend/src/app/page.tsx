import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-muted/30">
      <section className="flex w-full flex-col items-center gap-3 px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Tìm khách sạn phù hợp với bạn</h1>
        <p className="max-w-md text-muted-foreground">
          Tìm kiếm, so sánh và đặt phòng khách sạn nhanh chóng, thanh toán đơn giản.
        </p>
      </section>

      <form action="/hotels" method="GET" className="w-full max-w-2xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-3 rounded-xl border bg-background p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="num_guests">Số khách</Label>
            <Input id="num_guests" name="num_guests" type="number" min={1} placeholder="2" />
          </div>
          <Button type="submit" className="sm:col-span-2 lg:col-span-4">
            Tìm kiếm
          </Button>
        </div>
      </form>
    </div>
  );
}
