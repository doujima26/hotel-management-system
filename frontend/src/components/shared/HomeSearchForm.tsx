"use client";

import { useRef, useState } from "react";
import type { FormEvent, SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityAutocomplete } from "@/components/shared/CityAutocomplete";
import { addDaysToDateString, todayDateString } from "@/lib/utils/date";

const UNDERLINE_INPUT_CLASS = "rounded-none border-0 border-b px-0 shadow-none focus-visible:ring-0";

const PAST_CHECK_IN_MESSAGE = "Ngày nhận phòng không được ở quá khứ.";
const CHECK_OUT_BEFORE_CHECK_IN_MESSAGE = "Ngày trả phòng phải sau ngày nhận phòng.";

// Form tim kiem o trang chu - tach thanh client component vi CityAutocomplete
// can state phia client, con lai trang chu van la Server Component.
export function HomeSearchForm() {
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);

  const today = todayDateString();
  const minCheckOut = addDaysToDateString(checkIn || today, 1);

  function handleCheckInChange(e: FormEvent<HTMLInputElement>) {
    e.currentTarget.setCustomValidity("");
    const value = e.currentTarget.value;
    setCheckIn(value);
    // Neu ngay tra phong da chon khong con sau ngay nhan phong moi, xoa de
    // bat khach chon lai - tranh loi bat ngo luc bam tim kiem.
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
      className="flex flex-col gap-5 rounded-[1.75rem] border bg-card/95 p-5 shadow-2xl backdrop-blur-md sm:flex-row sm:items-end sm:gap-4 sm:p-6"
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="city" className="text-xs tracking-wide text-muted-foreground uppercase">
          Thành phố
        </Label>
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
          placeholder="Bạn muốn đến đâu?"
          inputGroupClassName={UNDERLINE_INPUT_CLASS}
        />
      </div>
      <div className="hidden h-10 w-px bg-border sm:block" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="check_in" className="text-xs tracking-wide text-muted-foreground uppercase">
          Nhận phòng
        </Label>
        <Input
          id="check_in"
          name="check_in"
          type="date"
          min={today}
          value={checkIn}
          onChange={handleCheckInChange}
          onInvalid={handleCheckInInvalid}
          className={UNDERLINE_INPUT_CLASS}
        />
      </div>
      <div className="hidden h-10 w-px bg-border sm:block" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="check_out" className="text-xs tracking-wide text-muted-foreground uppercase">
          Trả phòng
        </Label>
        <Input
          id="check_out"
          name="check_out"
          type="date"
          min={minCheckOut}
          value={checkOut}
          onChange={(e) => {
            e.currentTarget.setCustomValidity("");
            setCheckOut(e.currentTarget.value);
          }}
          onInvalid={handleCheckOutInvalid}
          className={UNDERLINE_INPUT_CLASS}
        />
      </div>
      <div className="hidden h-10 w-px bg-border sm:block" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="num_guests" className="text-xs tracking-wide text-muted-foreground uppercase">
          Số khách
        </Label>
        <Input
          id="num_guests"
          name="num_guests"
          type="number"
          min={1}
          placeholder="2"
          className={UNDERLINE_INPUT_CLASS}
        />
      </div>
      <Button type="submit" size="lg" className="rounded-full">
        Tìm kiếm
      </Button>
    </form>
  );
}
