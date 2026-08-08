"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BedDouble, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatBedConfig, formatMoney } from "@/lib/utils/format";
import { roomsApi } from "@/lib/api/rooms";
import { getErrorMessage } from "@/types/api";
import type { RoomType } from "@/types/models";
import { canEditListing, listingLockMessage, useAdminHotel } from "../layout";
import { EmptyState } from "@/components/shared/EmptyState";

// Cac loai giuong chuan. Dung danh sach co san thay vi o chu tu do de du lieu
// khong bi lech chinh ta ("Queen"/"queen"/"giuong Queen") - gia tri nay hien
// truc tiep tren trang dat phong cua khach. Luu tu tieng Anh cho khop du lieu
// dang co trong DB.
//
// Chi la LOAI giuong, khong mang so luong: so luong nam o o rieng ben canh. Vi
// vay khong con muc "Twin" (Twin = 2 giuong don) - no da duoc quy doi thanh
// Single voi so luong 2.
const BED_TYPE_OPTIONS = [
  { value: "Single", label: "Giường đơn" },
  { value: "Double", label: "Giường đôi" },
  { value: "Queen", label: "Giường Queen" },
  { value: "King", label: "Giường King" },
  { value: "Bunk", label: "Giường tầng" },
  { value: "Sofa", label: "Giường sofa" },
];

const NO_BED_TYPE = "__none__";

interface RoomTypeFormValues {
  name: string;
  base_price: string;
  max_guests: string;
  total_rooms: string;
  bed_type: string;
  bed_count: string;
  area_sqm: string;
}

// Cap o "loai giuong + so luong". Gop thanh 1 component vi form tao va dialog
// sua can y nguyen quy tac ghep doi: so luong khong co nghia khi chua chon loai
// giuong nen bi khoa, va tu dat 1 ngay khi chon loai giuong.
function BedConfigFields({
  idPrefix,
  bedType,
  bedCount,
  onBedTypeChange,
  onBedCountChange,
}: {
  idPrefix: string;
  bedType: string;
  bedCount: string;
  onBedTypeChange: (value: string) => void;
  onBedCountChange: (value: string) => void;
}) {
  function handleBedTypeChange(value: string) {
    onBedTypeChange(value);
    if (!value) onBedCountChange("");
    else if (!bedCount) onBedCountChange("1");
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}_bed`}>Loại giường</Label>
        <BedTypeSelect id={`${idPrefix}_bed`} value={bedType} onChange={handleBedTypeChange} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}_bed_count`}>Số giường mỗi phòng</Label>
        <Input
          id={`${idPrefix}_bed_count`}
          type="number"
          min={1}
          max={10}
          value={bedCount}
          onChange={(e) => onBedCountChange(e.target.value)}
          disabled={!bedType}
          placeholder={bedType ? "" : "Chọn loại giường trước"}
        />
      </div>
    </>
  );
}

// O chon loai giuong. Loai giuong la thong tin tuy chon nen luon co muc "chua
// chon"; neu loai phong dang mang gia tri la nhap tay tu truoc (khong nam trong
// danh sach chuan) thi ghep them vao de khong am tham lam mat gia tri do.
function BedTypeSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const options =
    value && !BED_TYPE_OPTIONS.some((opt) => opt.value === value)
      ? [...BED_TYPE_OPTIONS, { value, label: value }]
      : BED_TYPE_OPTIONS;

  return (
    <Select value={value || NO_BED_TYPE} onValueChange={(v) => onChange(!v || v === NO_BED_TYPE ? "" : v)}>
      <SelectTrigger id={id} className="w-full">
        {/* Phai tu format: mac dinh SelectValue hien gia tri tho (ma loai giuong). */}
        <SelectValue>
          {(current) =>
            current === NO_BED_TYPE
              ? "Chưa chọn"
              : (options.find((opt) => opt.value === current)?.label ?? "Chưa chọn")
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_BED_TYPE}>Chưa chọn</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function AdminRoomTypesPage() {
  const hotel = useAdminHotel();
  const queryClient = useQueryClient();
  const approved = canEditListing(hotel.status);

  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [maxGuests, setMaxGuests] = useState("2");
  const [totalRooms, setTotalRooms] = useState("1");
  const [bedType, setBedType] = useState("");
  const [bedCount, setBedCount] = useState("");
  const [areaSqm, setAreaSqm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RoomType | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [toggleBusyId, setToggleBusyId] = useState<number | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: roomTypes, isLoading, error } = useQuery({
    queryKey: ["room-types", hotel.id],
    queryFn: () => roomsApi.listRoomTypes(hotel.id),
  });

  async function handleToggleActive(roomType: RoomType) {
    setToggleBusyId(roomType.id);
    try {
      await roomsApi.updateRoomType(roomType.id, { is_active: !roomType.is_active });
      await queryClient.invalidateQueries({ queryKey: ["room-types", hotel.id] });
    } catch (err) {
      toast.error(getErrorMessage(err, "Cập nhật thất bại"));
    } finally {
      setToggleBusyId(null);
    }
  }

  async function handleDelete(roomTypeId: number) {
    setDeleteError(null);
    setDeleteBusyId(roomTypeId);
    try {
      await roomsApi.deleteRoomType(roomTypeId);
      toast.success("Xóa loại phòng thành công");
      await queryClient.invalidateQueries({ queryKey: ["room-types", hotel.id] });
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Xóa thất bại"));
    } finally {
      setDeleteBusyId(null);
    }
  }

  async function saveEdit(values: RoomTypeFormValues) {
    if (!editing) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      // Gui null khi de trong de xoa han gia tri cu (backend dung exclude_unset
      // nen null moi la "dat ve rong", bo qua field thi giu nguyen gia tri cu).
      await roomsApi.updateRoomType(editing.id, {
        name: values.name.trim(),
        base_price: Number(values.base_price),
        max_guests: Number(values.max_guests),
        total_rooms: Number(values.total_rooms),
        bed_type: values.bed_type || null,
        bed_count: values.bed_type ? Number(values.bed_count || 1) : null,
        area_sqm: values.area_sqm ? Number(values.area_sqm) : null,
      });
      toast.success("Cập nhật loại phòng thành công");
      await queryClient.invalidateQueries({ queryKey: ["room-types", hotel.id] });
      setEditing(null);
    } catch (err) {
      setEditError(getErrorMessage(err, "Cập nhật thất bại"));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleCreate() {
    setFormError(null);
    setSubmitting(true);
    try {
      // bed_type/area_sqm la tuy chon: de trong thi khong gui field len, vi
      // backend chan area_sqm <= 0 nen gui chuoi rong se thanh 0 va bi tu choi.
      await roomsApi.createRoomType({
        hotel_id: hotel.id,
        name,
        base_price: Number(basePrice),
        max_guests: Number(maxGuests),
        total_rooms: Number(totalRooms),
        ...(bedType ? { bed_type: bedType, bed_count: Number(bedCount || 1) } : {}),
        ...(areaSqm ? { area_sqm: Number(areaSqm) } : {}),
      });
      toast.success("Tạo loại phòng thành công");
      setName("");
      setBasePrice("");
      setMaxGuests("2");
      setTotalRooms("1");
      setBedType("");
      setBedCount("");
      setAreaSqm("");
      await queryClient.invalidateQueries({ queryKey: ["room-types", hotel.id] });
    } catch (err) {
      setFormError(getErrorMessage(err, "Tạo loại phòng thất bại"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tạo loại phòng mới</CardTitle>
          <CardDescription>
            {approved
              ? "Có thể sửa, tắt hoặc xóa loại phòng sau khi tạo (chỉ xóa được khi chưa có phòng vật lý/booking nào)."
              : listingLockMessage(hotel.status, "tạo loại phòng")}
          </CardDescription>
        </CardHeader>
        {approved && (
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rt_name">Tên loại phòng</Label>
                <Input id="rt_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Deluxe" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rt_price">Giá mỗi đêm (VND)</Label>
                <Input
                  id="rt_price"
                  type="number"
                  min={0}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rt_guests">Số khách tối đa/phòng</Label>
                <Input
                  id="rt_guests"
                  type="number"
                  min={1}
                  value={maxGuests}
                  onChange={(e) => setMaxGuests(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rt_total">Tổng số phòng loại này</Label>
                <Input
                  id="rt_total"
                  type="number"
                  min={1}
                  value={totalRooms}
                  onChange={(e) => setTotalRooms(e.target.value)}
                />
              </div>
              <BedConfigFields
                idPrefix="rt"
                bedType={bedType}
                bedCount={bedCount}
                onBedTypeChange={setBedType}
                onBedCountChange={setBedCount}
              />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rt_area">Diện tích (m²)</Label>
                <Input
                  id="rt_area"
                  type="number"
                  min={1}
                  value={areaSqm}
                  onChange={(e) => setAreaSqm(e.target.value)}
                  placeholder="Ví dụ: 24"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Loại giường, số giường và diện tích hiển thị cho khách ở trang đặt phòng (không bắt buộc, nhưng nên điền
              để khách dễ so sánh - nhất là phòng nhiều khách cần rõ có mấy giường).
            </p>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button
              onClick={handleCreate}
              disabled={submitting || !name.trim() || !basePrice || !maxGuests || !totalRooms}
              className="self-start"
            >
              {submitting ? "Đang tạo..." : "Tạo loại phòng"}
            </Button>
          </CardContent>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Danh sách loại phòng</h2>
        {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
        {error && (
          <p className="text-sm text-destructive">
            {getErrorMessage(error, "Không thể tải danh sách loại phòng")}
          </p>
        )}
        {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
        {roomTypes?.map((roomType) => (
          <Card key={roomType.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{roomType.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatMoney(roomType.base_price)}/đêm</span>
                  <Badge variant={roomType.is_active ? "secondary" : "destructive"}>
                    {roomType.is_active ? "Đang mở" : "Đã tắt"}
                  </Badge>
                </div>
              </div>
              <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Tối đa {roomType.max_guests} khách/phòng - {roomType.total_rooms} phòng
                </span>
                {formatBedConfig(roomType.bed_type, roomType.bed_count) && (
                  <span className="flex items-center gap-1">
                    <BedDouble className="size-3.5" />
                    {formatBedConfig(roomType.bed_type, roomType.bed_count)}
                  </span>
                )}
                {roomType.area_sqm != null && (
                  <span className="flex items-center gap-1">
                    <Maximize2 className="size-3.5" />
                    {roomType.area_sqm} m²
                  </span>
                )}
                {/* Nhac ngay tren the khi con thieu - 2 thong tin nay hien cho
                    khach nen de trong se lam the phong ben trang dat phong so sai. */}
                {(!roomType.bed_type || roomType.area_sqm == null) && (
                  <span className="text-warning-strong">Chưa có loại giường/diện tích</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Link href={`/admin/room-types/${roomType.id}/rooms`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Quản lý phòng vật lý &amp; ảnh
              </Link>
              <Link href={`/admin/pricing?room_type=${roomType.id}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Giá theo ngày
              </Link>
              <Button size="sm" variant="outline" onClick={() => setEditing(roomType)}>
                Sửa
              </Button>
              <Button
                size="sm"
                variant={roomType.is_active ? "destructive" : "default"}
                onClick={() => handleToggleActive(roomType)}
                disabled={toggleBusyId === roomType.id}
              >
                {roomType.is_active ? "Tắt" : "Bật lại"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(roomType.id)}
                disabled={deleteBusyId === roomType.id}
              >
                Xóa
              </Button>
            </CardContent>
          </Card>
        ))}
        {roomTypes && roomTypes.length === 0 && (
          <EmptyState
            title="Chưa có loại phòng nào"
            hint="Dùng biểu mẫu phía trên để tạo loại phòng đầu tiên, sau đó thêm phòng vật lý để bắt đầu bán."
          />
        )}
      </div>

      {editing && (
        <EditRoomTypeDialog
          roomType={editing}
          error={editError}
          submitting={editSubmitting}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}

function EditRoomTypeDialog({
  roomType,
  error,
  submitting,
  onClose,
  onSave,
}: {
  roomType: RoomType;
  error: string | null;
  submitting: boolean;
  onClose: () => void;
  onSave: (values: RoomTypeFormValues) => void;
}) {
  const [name, setName] = useState(roomType.name);
  const [basePrice, setBasePrice] = useState(String(roomType.base_price));
  const [maxGuests, setMaxGuests] = useState(String(roomType.max_guests));
  const [totalRooms, setTotalRooms] = useState(String(roomType.total_rooms));
  const [bedType, setBedType] = useState(roomType.bed_type ?? "");
  const [bedCount, setBedCount] = useState(roomType.bed_count != null ? String(roomType.bed_count) : "");
  const [areaSqm, setAreaSqm] = useState(roomType.area_sqm != null ? String(roomType.area_sqm) : "");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa loại phòng</DialogTitle>
          <DialogDescription>Cập nhật thông tin loại phòng.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_rt_name">Tên loại phòng</Label>
            <Input id="edit_rt_name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_rt_price">Giá mỗi đêm (VND)</Label>
            <Input id="edit_rt_price" type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_rt_guests">Số khách tối đa/phòng</Label>
              <Input id="edit_rt_guests" type="number" min={1} value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_rt_total">Tổng số phòng</Label>
              <Input id="edit_rt_total" type="number" min={1} value={totalRooms} onChange={(e) => setTotalRooms(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <BedConfigFields
              idPrefix="edit_rt"
              bedType={bedType}
              bedCount={bedCount}
              onBedTypeChange={setBedType}
              onBedCountChange={setBedCount}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_rt_area">Diện tích (m²)</Label>
            <Input id="edit_rt_area" type="number" min={1} value={areaSqm} onChange={(e) => setAreaSqm(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={() =>
              onSave({
                name,
                base_price: basePrice,
                max_guests: maxGuests,
                total_rooms: totalRooms,
                bed_type: bedType,
                bed_count: bedCount,
                area_sqm: areaSqm,
              })
            }
            disabled={submitting}
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
