"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatMoney } from "@/lib/utils/format";
import type { HotelHighlight } from "@/types/models";

interface HotelHighlightScrollerProps {
  title: string;
  subtitle?: string;
  items: HotelHighlight[];
}

// Khoi cuon ngang danh sach khach san rut gon o trang chu (uu dai giam gia,
// duoc yeu thich...) - dieu huong bang nut mui ten 2 ben ,
// khong con keo/cuon tu do nhu truoc. Dung chung 1 component de dong bo giao
// dien giua cac muc.
export function HotelHighlightScroller({ title, subtitle, items }: HotelHighlightScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [items.length]);

  function scrollByCard(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement | null;
    if (!firstCard) return;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0");
    el.scrollBy({ left: direction * (firstCard.offsetWidth + gap), behavior: "smooth" });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-extrabold sm:text-2xl">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="relative">
        <button
          type="button"
          aria-label="Xem trước"
          onClick={() => scrollByCard(-1)}
          disabled={!canScrollLeft}
          className="absolute top-1/2 left-1 z-10 -translate-y-1/2 rounded-full border bg-background/90 p-2 shadow-md backdrop-blur-sm transition-opacity disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((hotel) => (
            <Link
              key={hotel.id}
              href={`/hotels/${hotel.id}`}
              className="shrink-0 snap-start basis-[80%] overflow-hidden rounded-xl border transition-colors hover:border-primary/40 sm:basis-[calc((100%-1rem)/2)] md:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-3rem)/4)]"
            >
              <div className="relative h-40 w-full bg-muted">
                {hotel.primary_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL anh tuy y (admin dan), khong khai bao truoc duoc remotePatterns cho next/image
                  <img src={hotel.primary_image_url} alt={hotel.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Building2 className="size-8" />
                  </div>
                )}
                {hotel.star_rating && (
                  <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                    {hotel.star_rating}★
                  </span>
                )}
                {hotel.discount_percent && (
                  <span className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    -{hotel.discount_percent}%
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 p-3">
                <p className="truncate font-semibold">{hotel.name}</p>
                <p className="truncate text-xs text-muted-foreground">{hotel.city}</p>
                {hotel.total_reviews > 0 && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {/* Diem thang 10 de trong the diem, khong dung icon ngoi sao -
                        ngoi sao de danh cho HANG SAO cua khach san. */}
                    <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                      {hotel.avg_rating.toFixed(1)}
                    </span>
                    ({hotel.total_reviews} đánh giá)
                  </p>
                )}
                {hotel.from_price != null && (
                  <div className="mt-1 flex items-baseline gap-2">
                    {hotel.discounted_price != null && hotel.discount_percent ? (
                      <>
                        <span className="text-xs text-muted-foreground line-through">{formatMoney(hotel.from_price)}</span>
                        <span className="font-semibold text-primary">{formatMoney(hotel.discounted_price)}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Từ <span className="font-semibold text-foreground">{formatMoney(hotel.from_price)}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        <button
          type="button"
          aria-label="Xem tiếp"
          onClick={() => scrollByCard(1)}
          disabled={!canScrollRight}
          className="absolute top-1/2 right-1 z-10 -translate-y-1/2 rounded-full border bg-background/90 p-2 shadow-md backdrop-blur-sm transition-opacity disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
