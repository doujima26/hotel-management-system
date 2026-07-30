"use client";

import { useState } from "react";
import { BedDouble, Building2, Check, ChevronLeft, ChevronRight, Maximize2, User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBedConfig } from "@/lib/utils/format";
import type { RoomTypeAvailability } from "@/types/models";

interface RoomTypeDetailDialogProps {
  room: RoomTypeAvailability | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Cua so chi tiet loai phong: bo anh (anh lon + thumbnail) va toan bo thong tin
// dien tich / giuong / suc chua / mo ta / tien nghi gom theo nhom.
export function RoomTypeDetailDialog({ room, open, onOpenChange }: RoomTypeDetailDialogProps) {
  const [imageIndex, setImageIndex] = useState(0);

  if (!room) return null;

  const images = room.images;
  const activeImage = images[Math.min(imageIndex, images.length - 1)];

  // Gom tien nghi theo category de hien thanh tung nhom nhu Booking.
  const groups = new Map<string, string[]>();
  for (const amenity of room.amenities) {
    const key = amenity.category || "Tiện nghi";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(amenity.name);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setImageIndex(0);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] w-[min(56rem,95vw)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{room.name}</DialogTitle>
          <DialogDescription>Thông tin chi tiết về loại phòng này.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Bo anh */}
          <div className="flex flex-col gap-2">
            <div className="relative h-56 overflow-hidden rounded-lg bg-muted sm:h-64">
              {activeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeImage} alt={room.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Building2 className="size-10" />
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Ảnh trước"
                    onClick={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
                    className="absolute top-1/2 left-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Ảnh sau"
                    onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                    className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setImageIndex(index)}
                    className={`size-14 shrink-0 overflow-hidden rounded-md border-2 ${
                      index === imageIndex ? "border-primary" : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Thong tin */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {room.area_sqm && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-sm">
                  <Maximize2 className="size-4 text-muted-foreground" /> {room.area_sqm} m²
                </span>
              )}
              {formatBedConfig(room.bed_type, room.bed_count) && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-sm">
                  <BedDouble className="size-4 text-muted-foreground" /> {formatBedConfig(room.bed_type, room.bed_count)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-sm">
                <User className="size-4 text-muted-foreground" /> Tối đa {room.max_guests} khách
              </span>
            </div>

            {room.description && <p className="text-sm leading-relaxed">{room.description}</p>}

            {groups.size > 0 ? (
              <div className="flex flex-col gap-3">
                {[...groups.entries()].map(([category, names]) => (
                  <div key={category}>
                    <p className="mb-1.5 text-sm font-semibold">{category}</p>
                    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {names.map((name) => (
                        <li key={name} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Check className="size-4 shrink-0 text-primary" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Khách sạn chưa cập nhật tiện nghi cho loại phòng này.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
