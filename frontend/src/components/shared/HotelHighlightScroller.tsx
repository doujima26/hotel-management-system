import Link from "next/link";
import { Building2, Star } from "lucide-react";
import { formatMoney } from "@/lib/utils/format";
import type { HotelHighlight } from "@/types/models";

interface HotelHighlightScrollerProps {
  title: string;
  subtitle?: string;
  items: HotelHighlight[];
}

// Khoi cuon ngang danh sach khach san rut gon o trang chu (uu dai giam gia,
// duoc yeu thich...) - dung chung 1 component de dong bo giao dien giua cac muc.
export function HotelHighlightScroller({ title, subtitle, items }: HotelHighlightScrollerProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-extrabold sm:text-2xl">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2">
        {items.map((hotel) => (
          <Link
            key={hotel.id}
            href={`/hotels/${hotel.id}`}
            className="w-64 shrink-0 snap-start overflow-hidden rounded-xl border transition-colors hover:border-primary/40 sm:w-72"
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
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="size-3 fill-primary text-primary" />
                  {hotel.avg_rating.toFixed(1)} ({hotel.total_reviews} đánh giá)
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
    </div>
  );
}
