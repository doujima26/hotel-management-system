"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { vi } from "react-day-picker/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

// Nhan thu gon dung rieng cho luoi lich hep (khac "Thu 2"... day du dung o
// cac bang lich rong hon nhu RateCalendarSection) - CN giu nguyen vi day la
// each viet tat pho bien, khong phai tieng Anh con sot.
const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

function formatCaptionVi(month: Date): string {
  return `Tháng ${month.getMonth() + 1} năm ${month.getFullYear()}`
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={vi}
      showOutsideDays={showOutsideDays}
      weekStartsOn={1}
      formatters={{
        formatWeekdayName: (date) => WEEKDAY_SHORT[date.getDay()],
        formatCaption: (date) => formatCaptionVi(date),
      }}
      labels={{
        labelPrevious: () => "Tháng trước",
        labelNext: () => "Tháng sau",
        labelWeekday: (date) => WEEKDAY_SHORT[date.getDay()],
        labelDayButton: (date) => date.toLocaleDateString("vi-VN"),
      }}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-3",
        month: "flex flex-col gap-3",
        month_caption: "flex items-center justify-center pt-1 text-sm font-medium",
        nav: "absolute inset-x-1 top-1 flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "size-7 bg-transparent p-0",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "size-7 bg-transparent p-0",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 text-center text-[0.7rem] font-medium text-muted-foreground",
        week: "mt-1.5 flex w-full",
        day: "relative size-8 p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 rounded-md p-0 font-normal aria-selected:opacity-100",
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-30",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...chevronProps} />
          ) : (
            <ChevronRight className="size-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
