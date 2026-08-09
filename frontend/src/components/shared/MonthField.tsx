"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const THANG_NHAN = [
  "Th 1", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6",
  "Th 7", "Th 8", "Th 9", "Th 10", "Th 11", "Th 12",
];

interface MonthFieldProps {
  id?: string;
  value: string; // dang YYYY-MM
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}

// O chon thang/nam dung luoi rieng hien thi tieng Viet, thay <input
// type="month"> goc cua trinh duyet (cung bi ngon ngu trinh duyet chi phoi
// giong <input type="date">, xem DateField.tsx).
export function MonthField({ id, value, onChange, className, "aria-label": ariaLabel }: MonthFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [year, month] = value.split("-").map(Number);
  const [viewYear, setViewYear] = React.useState(year || new Date().getFullYear());
  const [prevYear, setPrevYear] = React.useState(year);

  // Dua nam dang xem ve dung nam cua gia tri khi prop value doi.
  if (year && year !== prevYear) {
    setPrevYear(year);
    setViewYear(year);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            aria-label={ariaLabel}
            className={cn(
              "flex h-8 items-center justify-center rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground transition-colors outline-none hover:border-ring/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              className,
            )}
          />
        }
      >
        {year && month ? `Tháng ${month} năm ${year}` : "Chọn tháng"}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3">
        <div className="mb-2 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Năm trước"
            onClick={() => setViewYear((y) => y - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium">{viewYear}</span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Năm sau"
            onClick={() => setViewYear((y) => y + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {THANG_NHAN.map((label, index) => {
            const monthNumber = index + 1;
            const isSelected = viewYear === year && monthNumber === month;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onChange(`${viewYear}-${String(monthNumber).padStart(2, "0")}`);
                  setOpen(false);
                }}
                className={cn(
                  buttonVariants({ variant: isSelected ? "default" : "ghost", size: "sm" }),
                  "font-normal",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
