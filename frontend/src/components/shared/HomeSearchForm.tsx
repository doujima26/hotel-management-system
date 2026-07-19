"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityAutocomplete } from "@/components/shared/CityAutocomplete";

const UNDERLINE_INPUT_CLASS = "rounded-none border-0 border-b px-0 shadow-none focus-visible:ring-0";

// Form tim kiem o trang chu - tach thanh client component vi CityAutocomplete
// can state phia client, con lai trang chu van la Server Component.
export function HomeSearchForm() {
  const [city, setCity] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);

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
        <Input id="check_in" name="check_in" type="date" className={UNDERLINE_INPUT_CLASS} />
      </div>
      <div className="hidden h-10 w-px bg-border sm:block" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="check_out" className="text-xs tracking-wide text-muted-foreground uppercase">
          Trả phòng
        </Label>
        <Input id="check_out" name="check_out" type="date" className={UNDERLINE_INPUT_CLASS} />
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
