"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";

// Chuoi dang YYYY-MM-DD (gio dia phuong, khong qua UTC) <-> Date, dung chung
// quy uoc voi lib/utils/date.ts de tranh lech ngay do mui gio.
function parseDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface DateFieldProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  onInvalid?: React.FormEventHandler<HTMLInputElement>;
  "aria-label"?: string;
  // Ngay moc (vd ngay nhan phong) de to dam dai ngay tu moc toi ngay dang ren
  // chuot toi/da chon trong lich - giup thay ro dang chon bao nhieu dem, giong
  // Booking.com. Chi dung cho o "ngay tra", o "ngay nhan" khong truyen prop nay.
  rangeStart?: string;
}

// O chon 1 ngay dung lich rieng hien thi tieng Viet, thay the <input
// type="date"> goc cua trinh duyet (lich goc luon hien tieng Anh theo ngon
// ngu trinh duyet cua nguoi dung, khong theo lang="vi" cua trang).
//
// Van giu 1 input type=date THAT trong DOM (an bang opacity-0 + khop dung
// kich thuoc nut hien thi, khong dung display:none) de:
// - Form submit native (GET) van gui dung name=value nhu truoc.
// - required/min/onInvalid van hoat dong dung nhu cu, bubble loi neo dung cho.
export function DateField({
  id,
  name,
  value,
  onChange,
  min,
  max,
  required,
  placeholder = "Chọn ngày",
  className,
  onInvalid,
  "aria-label": ariaLabel,
  rangeStart,
}: DateFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [hoveredDate, setHoveredDate] = React.useState<Date | undefined>(undefined);
  const hiddenInputRef = React.useRef<HTMLInputElement>(null);
  const selected = parseDateString(value);
  const minDate = parseDateString(min);
  const maxDate = parseDateString(max);
  const anchorDate = parseDateString(rangeStart);
  // Dai ngay dang xem: uu tien ngay dang ren chuot toi, chua ren thi lay ngay
  // da chon - de dai to dam con hien ngay ca khi chuot da roi khoi lich.
  const previewEnd = hoveredDate ?? selected;

  // Xoa thong bao loi tuy chinh (neu co) moi lan gia tri doi, giong hanh vi
  // cua input goc - khong thi customValidity cu bam mai du gia tri sau do da
  // hop le. Dung chung cho ca 2 duong doi gia tri: go/xoa tren input that
  // (hau nhu khong xay ra vi da khoa pointer-events) va chon tren lich.
  function handleValueChange(nextValue: string) {
    hiddenInputRef.current?.setCustomValidity("");
    onChange(nextValue);
  }

  return (
    <div className="relative">
      <input
        ref={hiddenInputRef}
        type="date"
        id={id}
        name={name}
        value={value}
        min={min}
        max={max}
        required={required}
        onInvalid={onInvalid}
        onChange={(e) => handleValueChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 h-8 w-full opacity-0"
        style={{ pointerEvents: "none" }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={ariaLabel}
              className={cn(
                "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground transition-colors outline-none hover:border-ring/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                !value && "text-muted-foreground",
                className,
              )}
            />
          }
        >
          <span>{value ? formatDate(value) : placeholder}</span>
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected ?? anchorDate ?? minDate}
            onSelect={(date) => {
              if (date) handleValueChange(toDateString(date));
              setOpen(false);
            }}
            onDayMouseEnter={(date) => setHoveredDate(date)}
            onDayMouseLeave={() => setHoveredDate(undefined)}
            disabled={(date) => Boolean((minDate && date < minDate) || (maxDate && date > maxDate))}
            modifiers={
              anchorDate
                ? {
                    rangeAnchor: anchorDate,
                    rangeBand: (date) => {
                      if (!previewEnd) return false;
                      const from = anchorDate < previewEnd ? anchorDate : previewEnd;
                      const to = anchorDate < previewEnd ? previewEnd : anchorDate;
                      return date > from && date < to;
                    },
                  }
                : undefined
            }
            modifiersClassNames={{
              rangeAnchor: "[&>button]:ring-2 [&>button]:ring-primary [&>button]:ring-inset",
              rangeBand: "bg-muted [&>button]:font-bold [&>button]:rounded-none",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
