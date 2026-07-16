import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-muted/30">
      <section className="flex w-full flex-col items-center gap-3 px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Tim khach san phu hop voi ban</h1>
        <p className="max-w-md text-muted-foreground">
          Tim kiem, so sanh va dat phong khach san nhanh chong, thanh toan don gian.
        </p>
      </section>

      <form action="/hotels" method="GET" className="w-full max-w-2xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-3 rounded-xl border bg-background p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">Thanh pho</Label>
            <Input id="city" name="city" placeholder="Vi du: Da Nang" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="check_in">Nhan phong</Label>
            <Input id="check_in" name="check_in" type="date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="check_out">Tra phong</Label>
            <Input id="check_out" name="check_out" type="date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="num_guests">So khach</Label>
            <Input id="num_guests" name="num_guests" type="number" min={1} placeholder="2" />
          </div>
          <Button type="submit" className="sm:col-span-2 lg:col-span-4">
            Tim kiem
          </Button>
        </div>
      </form>
    </div>
  );
}
