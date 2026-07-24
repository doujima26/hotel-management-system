"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { HotelImage } from "@/types/models";

interface HotelGalleryProps {
  images: HotelImage[];
  hotelName: string;
}

// Gallery anh khach san: 1 anh lon + luoi thumbnail, click mo lightbox xem to
// (co prev/next, dong bang X hoac Esc). Client component vi can state lightbox.
export function HotelGallery({ images, hotelName }: HotelGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length)),
    [images.length],
  );
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i + 1) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, close, prev, next]);

  if (images.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Building2 className="size-10" />
      </div>
    );
  }

  const main = images[0];
  const thumbs = images.slice(1, 5);
  const remaining = images.length - 5;

  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:grid-rows-2">
        <button
          type="button"
          onClick={() => setOpenIndex(0)}
          className="relative col-span-1 h-56 overflow-hidden rounded-xl sm:col-span-2 sm:row-span-2 sm:h-auto"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={main.image_url} alt={hotelName} className="h-full w-full object-cover transition-transform hover:scale-105" />
        </button>
        {thumbs.map((image, idx) => {
          const realIndex = idx + 1;
          const isLast = idx === thumbs.length - 1 && remaining > 0;
          return (
            <button
              key={image.id}
              type="button"
              onClick={() => setOpenIndex(realIndex)}
              className="relative hidden h-28 overflow-hidden rounded-xl sm:block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.image_url} alt="" className="h-full w-full object-cover transition-transform hover:scale-105" />
              {isLast && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
                  +{remaining} ảnh
                </span>
              )}
            </button>
          );
        })}
      </div>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Đóng"
            className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X className="size-5" />
          </button>
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Ảnh trước"
              className="absolute left-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[openIndex].image_url}
            alt={hotelName}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Ảnh sau"
              className="absolute right-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <ChevronRight className="size-5" />
            </button>
          )}
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
            {openIndex + 1} / {images.length}
          </span>
        </div>
      )}
    </>
  );
}
