"use client";

import { useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AmenityIcon } from "@/components/shared/AmenityIcon";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { hotelsApi } from "@/lib/api/hotels";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import type { Amenity } from "@/types/models";
import { canEditListing, listingLockMessage, useAdminHotel } from "../layout";

// Nhan tieng Viet cho cac category co san trong danh muc. Category do Super
// Admin tu them (khong co trong bang nay) se hien nguyen van.
const CATEGORY_LABELS: Record<string, string> = {
  general: "Chung",
  view: "Tầm nhìn",
  room: "Trong phòng",
  activity: "Hoạt động",
};

function categoryLabel(category: string | null): string {
  if (!category) return "Khác";
  return CATEGORY_LABELS[category] ?? category;
}

// Gom tien nghi theo category, giu thu tu xuat hien de danh sach on dinh giua
// cac lan render.
function groupByCategory(amenities: Amenity[]): [string, Amenity[]][] {
  const groups = new Map<string, Amenity[]>();
  for (const amenity of amenities) {
    const key = categoryLabel(amenity.category);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(amenity);
  }
  return [...groups.entries()];
}

// The tien nghi bam de bat/tat - trang thai da chon vien + nen cam dam ro,
// kem dau tich o goc de khong chi phu thuoc vao mau (accessibility).
function AmenityToggleCard({
  amenity,
  selected,
  busy,
  onToggle,
}: {
  amenity: Amenity;
  selected: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-pressed={selected}
      title={selected ? `${amenity.name} - bấm để gỡ` : `${amenity.name} - bấm để chọn`}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors disabled:opacity-50",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-primary/5",
      )}
    >
      <span className="truncate">{amenity.name}</span>
      {selected && (
        <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-2.5" />
        </span>
      )}
    </button>
  );
}

export default function AdminAmenitiesPage() {
  const hotel = useAdminHotel();
  const approved = canEditListing(hotel.status);
  const queryClient = useQueryClient();

  const [hotelAmenityError, setHotelAmenityError] = useState<string | null>(null);
  const [roomAmenityError, setRoomAmenityError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [expandedRoomTypeIds, setExpandedRoomTypeIds] = useState<Set<number>>(new Set());

  function toggleRoomTypePanel(roomTypeId: number) {
    setExpandedRoomTypeIds((current) => {
      const next = new Set(current);
      if (next.has(roomTypeId)) {
        next.delete(roomTypeId);
      } else {
        next.add(roomTypeId);
      }
      return next;
    });
  }

  const { data: hotelCatalog, isLoading: hotelCatalogLoading } = useQuery({
    queryKey: ["amenities", "hotel"],
    queryFn: () => roomsApi.listAmenities("hotel"),
    enabled: approved,
  });

  const { data: assignedHotelAmenities } = useQuery({
    queryKey: ["hotel-amenities", hotel.id],
    queryFn: () => hotelsApi.listAmenities(),
    enabled: approved,
  });

  const { data: roomCatalog, isLoading: roomCatalogLoading } = useQuery({
    queryKey: ["amenities", "room"],
    queryFn: () => roomsApi.listAmenities("room"),
    enabled: approved,
  });

  const { data: roomTypes } = useQuery({
    queryKey: ["room-types", hotel.id],
    queryFn: () => roomsApi.listRoomTypes(hotel.id),
    enabled: approved,
  });

  // Lay tien nghi da gan cua TAT CA loai phong de dung bang ma tran - API chi
  // cho lay tung loai phong 1 nen goi song song bang useQueries.
  const roomTypeAmenityQueries = useQueries({
    queries: (roomTypes ?? []).map((rt) => ({
      queryKey: ["room-type-amenities", rt.id],
      queryFn: () => roomsApi.listRoomTypeAmenities(rt.id),
      enabled: approved,
    })),
  });

  const assignedByRoomType = new Map<number, Set<number>>();
  (roomTypes ?? []).forEach((rt, index) => {
    const result = roomTypeAmenityQueries[index]?.data;
    assignedByRoomType.set(rt.id, new Set(result?.map((a) => a.id)));
  });
  // Chan thao tac khi chua tai xong tien nghi cua tat ca loai phong - neu khong
  // moi o tich se hien "chua chon" roi moi nhay sang "da chon", de bam nham.
  const matrixLoading = roomTypeAmenityQueries.some((q) => q.isPending);

  async function handleToggleHotelAmenity(amenityId: number, assigned: boolean) {
    setHotelAmenityError(null);
    setBusyKey(`hotel-${amenityId}`);
    try {
      if (assigned) {
        await hotelsApi.unassignAmenity(amenityId);
        toast.success("Đã gỡ tiện nghi khỏi khách sạn");
      } else {
        await hotelsApi.assignAmenity(amenityId);
        toast.success("Gán tiện nghi vào khách sạn thành công");
      }
      await queryClient.invalidateQueries({ queryKey: ["hotel-amenities", hotel.id] });
    } catch (err) {
      setHotelAmenityError(err instanceof ApiError ? err.message : "Thao tác thất bại");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleToggleRoomAmenity(roomTypeId: number, amenityId: number, assigned: boolean) {
    setRoomAmenityError(null);
    setBusyKey(`room-${roomTypeId}-${amenityId}`);
    try {
      if (assigned) {
        await roomsApi.unassignAmenityFromRoomType(roomTypeId, amenityId);
      } else {
        await roomsApi.assignAmenityToRoomType(roomTypeId, amenityId);
      }
      await queryClient.invalidateQueries({ queryKey: ["room-type-amenities", roomTypeId] });
    } catch (err) {
      setRoomAmenityError(err instanceof ApiError ? err.message : "Thao tác thất bại");
    } finally {
      setBusyKey(null);
    }
  }

  const assignedHotelAmenityIds = new Set(assignedHotelAmenities?.map((a) => a.id));

  if (!approved) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tiện nghi</CardTitle>
          <CardDescription>{listingLockMessage(hotel.status, "chọn tiện nghi")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Tiện nghi khách sạn</CardTitle>
            {hotelCatalog && hotelCatalog.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Đã chọn {assignedHotelAmenityIds.size}/{hotelCatalog.length}
              </span>
            )}
          </div>
          <CardDescription>
            Tiện nghi chung của khách sạn (hồ bơi, bãi đỗ xe, gym...). Bấm để chọn hoặc gỡ - thay đổi được lưu ngay.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {hotelCatalogLoading && <p className="text-muted-foreground">Đang tải...</p>}
          {hotelAmenityError && <p className="text-sm text-destructive">{hotelAmenityError}</p>}
          {hotelCatalog?.length === 0 && (
            <EmptyState title="Chưa có tiện nghi nào trong danh mục" hint="Danh mục tiện nghi do Super Admin quản lý." />
          )}
          {groupByCategory(hotelCatalog ?? []).map(([category, amenities]) => (
            <div key={category} className="flex flex-col gap-2">
              {/* Icon thuoc ve danh muc nen hien o tieu de nhom, khong lap lai
                  tren tung the tien nghi. */}
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <AmenityIcon icon={amenities[0]?.category_icon ?? null} className="size-3.5 shrink-0" />
                {category}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {amenities.map((amenity) => (
                  <AmenityToggleCard
                    key={amenity.id}
                    amenity={amenity}
                    selected={assignedHotelAmenityIds.has(amenity.id)}
                    busy={busyKey === `hotel-${amenity.id}`}
                    onToggle={() => handleToggleHotelAmenity(amenity.id, assignedHotelAmenityIds.has(amenity.id))}
                  />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tiện nghi phòng</CardTitle>
          <CardDescription>
            Tiện nghi riêng của từng loại phòng (điều hòa, TV, minibar...). Bấm tên loại phòng để mở, chọn tiện nghi cho
            loại phòng đó - thay đổi được lưu ngay.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(roomCatalogLoading || matrixLoading) && <p className="text-muted-foreground">Đang tải...</p>}
          {roomAmenityError && <p className="text-sm text-destructive">{roomAmenityError}</p>}

          {roomTypes?.length === 0 && (
            <EmptyState
              title="Chưa có loại phòng nào"
              hint="Tạo loại phòng trước, sau đó quay lại đây để gán tiện nghi cho từng loại phòng."
            />
          )}
          {roomTypes && roomTypes.length > 0 && roomCatalog?.length === 0 && (
            <EmptyState title="Chưa có tiện nghi phòng nào trong danh mục" hint="Danh mục tiện nghi do Super Admin quản lý." />
          )}

          {/* Moi loai phong 1 panel gap/mo - so loai phong tang thi trang dai
              xuong chu khong rong ra, khong bao gio vo bo cuc nhu bang ma tran
              (cot tang theo so loai phong). */}
          {roomTypes && roomTypes.length > 0 && roomCatalog && roomCatalog.length > 0 && (
            <div className="flex flex-col gap-2">
              {roomTypes.map((rt) => {
                const assignedIds = assignedByRoomType.get(rt.id) ?? new Set<number>();
                const expanded = expandedRoomTypeIds.has(rt.id);
                return (
                  <div key={rt.id} className="overflow-hidden rounded-lg border">
                    <button
                      type="button"
                      onClick={() => toggleRoomTypePanel(rt.id)}
                      aria-expanded={expanded}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary/5"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <ChevronRight className={cn("size-4 shrink-0 transition-transform", expanded && "rotate-90")} />
                        {rt.name}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          assignedIds.size > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {assignedIds.size}/{roomCatalog.length} tiện nghi
                      </span>
                    </button>
                    {expanded && (
                      <div className="flex flex-col gap-4 border-t p-3">
                        {groupByCategory(roomCatalog).map(([category, amenities]) => (
                          <div key={category} className="flex flex-col gap-2">
                            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                              <AmenityIcon icon={amenities[0]?.category_icon ?? null} className="size-3.5 shrink-0" />
                              {category}
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                              {amenities.map((amenity) => {
                                const assigned = assignedIds.has(amenity.id);
                                return (
                                  <AmenityToggleCard
                                    key={amenity.id}
                                    amenity={amenity}
                                    selected={assigned}
                                    busy={busyKey === `room-${rt.id}-${amenity.id}` || matrixLoading}
                                    onToggle={() => handleToggleRoomAmenity(rt.id, amenity.id, assigned)}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
