"use client";

import { useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityAutocomplete } from "@/components/shared/CityAutocomplete";
import { DateField } from "@/components/shared/DateField";
import { addDaysToDateString, todayDateString } from "@/lib/utils/date";

const PAST_CHECK_IN_MESSAGE = "Ngày nhận phòng không được ở quá khứ.";
const CHECK_OUT_BEFORE_CHECK_IN_MESSAGE = "Ngày trả phòng phải sau ngày nhận phòng.";

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
  const [checkIn, setCheckIn] = useState(defaultCheckIn || todayDateString());
  const [checkOut, setCheckOut] = useState(defaultCheckOut || addDaysToDateString(defaultCheckIn || todayDateString(), 1));
  const formRef = useRef<HTMLFormElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);

  const today = todayDateString();
  const minCheckOut = addDaysToDateString(checkIn || today, 1);

  function handleCheckInChange(value: string) {
    setCheckIn(value);
    if (checkOut && checkOut <= value) {
      setCheckOut("");
    }
  }

  function handleCheckInInvalid(e: SyntheticEvent<HTMLInputElement>) {
    e.currentTarget.setCustomValidity(PAST_CHECK_IN_MESSAGE);
  }

  function handleCheckOutInvalid(e: SyntheticEvent<HTMLInputElement>) {
    e.currentTarget.setCustomValidity(CHECK_OUT_BEFORE_CHECK_IN_MESSAGE);
  }

  return (
    <form
      ref={formRef}
      action="/hotels"
      method="GET"
      className="grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="city">Thành phố</Label>
        <input ref={cityInputRef} type="hidden" name="city" value={city} />
        <CityAutocomplete
          id="city"
          value={city}
          onValueChange={setCity}
          onCommit={(committedCity) => {
            // Dat truc tiep vao DOM truoc khi submit vi setCity (React state)
            // chua kip render lai luc requestSubmit() doc gia tri form.
            if (cityInputRef.current) cityInputRef.current.value = committedCity;
            formRef.current?.requestSubmit();
          }}
          placeholder="Ví dụ: Đà Nẵng"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="check_in">Nhận phòng</Label>
        <DateField
          id="check_in"
          name="check_in"
          min={today}
          value={checkIn}
          onChange={handleCheckInChange}
          onInvalid={handleCheckInInvalid}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="check_out">Trả phòng</Label>
        <DateField
          id="check_out"
          name="check_out"
          min={minCheckOut}
          value={checkOut}
          onChange={setCheckOut}
          onInvalid={handleCheckOutInvalid}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="num_guests">Số khách</Label>
        <Input id="num_guests" name="num_guests" type="number" min={1} defaultValue={defaultNumGuests || 1} />
      </div>
      <Button type="submit" className="self-end rounded-full">
        Tìm kiếm
      </Button>
    </form>
  );
}
