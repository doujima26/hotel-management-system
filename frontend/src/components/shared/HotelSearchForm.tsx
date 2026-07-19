"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityAutocomplete } from "@/components/shared/CityAutocomplete";

interface HotelSearchFormProps {
  defaultCity: string;
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultNumGuests: string;
}

// Form tim kiem o trang ket qua /hotels - tach thanh client component vi
// CityAutocomplete can state phia client, trang cha van la Server Component
// fetch du lieu (giong pattern FavoriteButton nhung trong trang hotels/[id]).
export function HotelSearchForm({
  defaultCity,
  defaultCheckIn,
  defaultCheckOut,
  defaultNumGuests,
}: HotelSearchFormProps) {
  const [city, setCity] = useState(defaultCity);

  return (
    <form
      action="/hotels"
      method="GET"
      className="grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="city">Thành phố</Label>
        <input type="hidden" name="city" value={city} />
        <CityAutocomplete id="city" value={city} onValueChange={setCity} placeholder="Ví dụ: Đà Nẵng" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="check_in">Nhận phòng</Label>
        <Input id="check_in" name="check_in" type="date" defaultValue={defaultCheckIn} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="check_out">Trả phòng</Label>
        <Input id="check_out" name="check_out" type="date" defaultValue={defaultCheckOut} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="num_guests">Số khách</Label>
        <Input id="num_guests" name="num_guests" type="number" min={1} defaultValue={defaultNumGuests} />
      </div>
      <Button type="submit" className="self-end rounded-full">
        Tìm kiếm
      </Button>
    </form>
  );
}
