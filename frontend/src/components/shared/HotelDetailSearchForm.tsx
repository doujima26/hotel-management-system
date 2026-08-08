"use client";

import { useState } from "react";
import type { SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/shared/DateField";
import { addDaysToDateString, todayDateString } from "@/lib/utils/date";

const PAST_CHECK_IN_MESSAGE = "Ngày nhận phòng không được ở quá khứ.";
const CHECK_OUT_BEFORE_CHECK_IN_MESSAGE = "Ngày trả phòng phải sau ngày nhận phòng.";

interface HotelDetailSearchFormProps {
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultNumGuests: string;
}

// Form chon ngay xem phong trong o trang chi tiet khach san - tach thanh
// client component vi can gioi han min/max dong theo ngay da chon (giong
// HotelSearchForm), trang cha van la Server Component fetch du lieu.
export function HotelDetailSearchForm({
  defaultCheckIn,
  defaultCheckOut,
  defaultNumGuests,
}: HotelDetailSearchFormProps) {
  const [checkIn, setCheckIn] = useState(defaultCheckIn || todayDateString());
  const [checkOut, setCheckOut] = useState(defaultCheckOut || addDaysToDateString(defaultCheckIn || todayDateString(), 1));

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
    <form className="grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="check_in">Nhận phòng</Label>
        <DateField
          id="check_in"
          name="check_in"
          min={today}
          value={checkIn}
          onChange={handleCheckInChange}
          onInvalid={handleCheckInInvalid}
          required
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
          rangeStart={checkIn}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="num_guests">Số khách</Label>
        <Input id="num_guests" name="num_guests" type="number" min={1} defaultValue={defaultNumGuests || 1} />
      </div>
      <Button type="submit" className="self-end rounded-full">
        Xem phòng trống
      </Button>
    </form>
  );
}
