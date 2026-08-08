"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateField } from "@/components/shared/DateField";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { roomsApi, type PricingRulePayload } from "@/lib/api/rooms";
import { getErrorMessage } from "@/types/api";
import type { DiscountType, PricingRecurrence } from "@/types/enums";
import type { PricingRule, RoomType } from "@/types/models";
import { canEditListing, canOperate, listingLockMessage, useAdminHotel } from "../layout";
import { RateCalendarSection } from "./RateCalendarSection";

const RECURRENCE_LABELS: Record<PricingRecurrence, string> = {
  one_time: "Áp dụng một lần",
  yearly: "Lặp lại hằng năm",
};

const ADJUSTMENT_TYPE_LABELS: Record<DiscountType, string> = {
  percentage: "Phần trăm",
  fixed_amount: "Số tiền cố định",
};

// Huong dieu chinh gia: giam gia luu gia tri am, phu thu luu gia tri duong.
type AdjustmentDirection = "discount" | "surcharge";

const DIRECTION_LABELS: Record<AdjustmentDirection, string> = {
  discount: "Giảm giá",
  surcharge: "Phụ thu",
};

// Thu trong tuan theo quy uoc EXTRACT(DOW) cua PostgreSQL: 0 la chu nhat.
const WEEKDAY_LABELS: Record<number, string> = {
  0: "CN",
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
};

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Mo ta khoang ngay ap dung cua quy tac de hien tren the.
function describePeriod(rule: PricingRule): string {
  if (rule.recurrence === "yearly") {
    return `Hằng năm ${rule.start_day}/${rule.start_month} - ${rule.end_day}/${rule.end_month}`;
  }
  if (!rule.start_date || !rule.end_date) return "Chưa đặt khoảng ngày";
  return `${formatDate(rule.start_date)} - ${formatDate(rule.end_date)}`;
}

// Mo ta muc dieu chinh kem huong tang hay giam.
function describeAdjustment(rule: PricingRule): string {
  const value = Math.abs(rule.adjustment_value);
  const amount = rule.adjustment_type === "percentage" ? `${value}%` : formatMoney(value);
  return `${rule.adjustment_value < 0 ? "Giảm" : "Tăng"} ${amount}`;
}

// Mo ta pham vi ap dung: ca khach san hay 1 loai phong.
function describeScope(rule: PricingRule): string {
  return rule.room_type_id === null ? "Mọi loại phòng" : (rule.room_type_name ?? `Loại phòng #${rule.room_type_id}`);
}

// Mo ta danh sach thu trong tuan duoc chon.
function describeWeekdays(weekdays: number[] | null): string | null {
  if (!weekdays || weekdays.length === 0) return null;
  return WEEKDAY_ORDER.filter((day) => weekdays.includes(day))
    .map((day) => WEEKDAY_LABELS[day])
    .join(", ");
}

// Boc Suspense vi ben trong dung useSearchParams - dung khuyen nghi cua Next.
export default function AdminPricingPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Đang tải...</p>}>
      <PricingPageContent />
    </Suspense>
  );
}

function PricingPageContent() {
  const hotel = useAdminHotel();
  const operating = canOperate(hotel.status);
  const editable = canEditListing(hotel.status);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<number | null>(null);

  const {
    data: rules,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pricing-rules"],
    queryFn: () => roomsApi.listPricingRules(),
    enabled: operating,
  });

  const { data: roomTypes } = useQuery({
    queryKey: ["room-types", hotel.id],
    queryFn: () => roomsApi.listRoomTypes(hotel.id),
    enabled: operating,
  });

  // Loai phong dang xem lich gia: uu tien lua chon cua nguoi dung, chua chon
  // thi lay theo tham so room_type tren URL (di tu danh sach loai phong sang),
  // khong khop thi lay loai phong dau tien.
  const roomTypeIdFromUrl = Number(searchParams.get("room_type")) || null;
  const shownRoomTypeId =
    selectedRoomTypeId ??
    (roomTypes?.some((item) => item.id === roomTypeIdFromUrl) ? roomTypeIdFromUrl : (roomTypes?.[0]?.id ?? null));

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["pricing-rules"] }),
      // Doi quy tac lam gia tung ngay doi theo, nen nap lai ca lich gia.
      queryClient.invalidateQueries({ queryKey: ["room-type-rates"] }),
    ]);
  }

  async function handleToggleActive(rule: PricingRule) {
    setBusyId(rule.id);
    try {
      await roomsApi.updatePricingRule(rule.id, { is_active: !rule.is_active });
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Cập nhật thất bại"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(ruleId: number) {
    setListError(null);
    setBusyId(ruleId);
    try {
      await roomsApi.deletePricingRule(ruleId);
      toast.success("Xóa quy tắc giá thành công");
      await refresh();
    } catch (err) {
      setListError(getErrorMessage(err, "Xóa thất bại"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tạo quy tắc giá</CardTitle>
          <CardDescription>
            {editable
              ? "Quy tắc tự áp khi tính giá từng đêm. Giá sửa tay trên lịch giá luôn được ưu tiên hơn quy tắc, và khi hai quy tắc cùng khớp một ngày thì chỉ quy tắc có độ ưu tiên cao hơn được áp."
              : listingLockMessage(hotel.status, "tạo quy tắc giá")}
          </CardDescription>
        </CardHeader>
        {editable && (
          <CardContent>
            <PricingRuleForm
              roomTypes={roomTypes ?? []}
              onSubmit={async (payload) => {
                await roomsApi.createPricingRule(payload);
                toast.success("Tạo quy tắc giá thành công");
                await refresh();
              }}
            />
          </CardContent>
        )}
      </Card>

      {operating && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Danh sách quy tắc</h2>
          {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
          {error && (
            <p className="text-sm text-destructive">
              {getErrorMessage(error, "Không thể tải danh sách quy tắc giá")}
            </p>
          )}
          {listError && <p className="text-sm text-destructive">{listError}</p>}
          {rules?.map((rule) => {
            const weekdayText = describeWeekdays(rule.weekdays);
            return (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>{rule.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Ưu tiên {rule.priority}</Badge>
                      <Badge variant={rule.is_active ? "secondary" : "destructive"}>
                        {rule.is_active ? "Đang áp dụng" : "Đã tắt"}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {describeAdjustment(rule)} · {describePeriod(rule)}
                    {weekdayText ? ` · Chỉ ${weekdayText}` : ""} · {describeScope(rule)} ·{" "}
                    {RECURRENCE_LABELS[rule.recurrence]}
                  </CardDescription>
                  {rule.description && (
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  )}
                </CardHeader>
                {editable && (
                  <CardContent className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(rule)}>
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant={rule.is_active ? "destructive" : "default"}
                      onClick={() => handleToggleActive(rule)}
                      disabled={busyId === rule.id}
                    >
                      {rule.is_active ? "Tắt" : "Bật lại"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(rule.id)}
                      disabled={busyId === rule.id}
                    >
                      Xóa
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
          {rules && rules.length === 0 && (
            <EmptyState
              title="Chưa có quy tắc giá nào"
              hint="Tạo quy tắc để giá phòng tự tăng dịp lễ và tự giảm mùa thấp điểm mà không phải sửa tay từng ngày."
            />
          )}
        </div>
      )}

      {operating && (
        <Card>
          <CardHeader>
            <CardTitle>Lịch giá theo ngày</CardTitle>
            <CardDescription>
              Giá thật của từng đêm sau khi áp quy tắc. Bấm vào giá để sửa tay riêng một ngày - ngày đã sửa tay sẽ
              không chịu tác động của quy tắc nào cho tới khi bạn xóa giá đó đi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RateCalendarSection
              roomTypes={roomTypes ?? []}
              selectedRoomTypeId={shownRoomTypeId}
              onSelectRoomType={setSelectedRoomTypeId}
              canEdit={editable}
            />
          </CardContent>
        </Card>
      )}

      {editing && (
        <EditPricingRuleDialog
          rule={editing}
          roomTypes={roomTypes ?? []}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            await roomsApi.updatePricingRule(editing.id, payload);
            toast.success("Cập nhật quy tắc giá thành công");
            await refresh();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// Gia tri form dung chung cho ca tao moi va sua.
interface FormState {
  name: string;
  description: string;
  roomTypeId: string;
  recurrence: PricingRecurrence;
  startDate: string;
  endDate: string;
  startDay: string;
  startMonth: string;
  endDay: string;
  endMonth: string;
  weekdays: number[];
  adjustmentType: DiscountType;
  direction: AdjustmentDirection;
  adjustmentValue: string;
  priority: string;
}

// Dung gia tri form ban dau tu 1 quy tac da co, dung khi mo hop thoai sua.
function toFormState(rule: PricingRule | null): FormState {
  if (!rule) {
    return {
      name: "",
      description: "",
      roomTypeId: "all",
      recurrence: "yearly",
      startDate: "",
      endDate: "",
      startDay: "",
      startMonth: "",
      endDay: "",
      endMonth: "",
      weekdays: [],
      adjustmentType: "percentage",
      direction: "discount",
      adjustmentValue: "",
      priority: "0",
    };
  }
  return {
    name: rule.name,
    description: rule.description ?? "",
    roomTypeId: rule.room_type_id === null ? "all" : String(rule.room_type_id),
    recurrence: rule.recurrence,
    startDate: rule.start_date ?? "",
    endDate: rule.end_date ?? "",
    startDay: rule.start_day === null ? "" : String(rule.start_day),
    startMonth: rule.start_month === null ? "" : String(rule.start_month),
    endDay: rule.end_day === null ? "" : String(rule.end_day),
    endMonth: rule.end_month === null ? "" : String(rule.end_month),
    weekdays: rule.weekdays ?? [],
    adjustmentType: rule.adjustment_type,
    direction: rule.adjustment_value < 0 ? "discount" : "surcharge",
    adjustmentValue: String(Math.abs(rule.adjustment_value)),
    priority: String(rule.priority),
  };
}

// Chuyen gia tri form thanh payload gui len API. Truong khong dung theo kieu
// lap lai duoc dat null de khong con du lieu thua tu lan sua truoc.
function toPayload(form: FormState): PricingRulePayload {
  const value = Math.abs(Number(form.adjustmentValue));
  const yearly = form.recurrence === "yearly";
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    room_type_id: form.roomTypeId === "all" ? null : Number(form.roomTypeId),
    recurrence: form.recurrence,
    start_date: yearly ? null : form.startDate,
    end_date: yearly ? null : form.endDate,
    start_month: yearly ? Number(form.startMonth) : null,
    start_day: yearly ? Number(form.startDay) : null,
    end_month: yearly ? Number(form.endMonth) : null,
    end_day: yearly ? Number(form.endDay) : null,
    weekdays: form.weekdays.length > 0 ? [...form.weekdays].sort((a, b) => a - b) : null,
    adjustment_type: form.adjustmentType,
    adjustment_value: form.direction === "discount" ? -value : value,
    priority: Number(form.priority) || 0,
  };
}

// Kiem tra du truong bat buoc truoc khi cho bam nut luu.
function isFormComplete(form: FormState): boolean {
  if (!form.name.trim() || !form.adjustmentValue) return false;
  if (form.recurrence === "yearly") {
    return Boolean(form.startDay && form.startMonth && form.endDay && form.endMonth);
  }
  return Boolean(form.startDate && form.endDate);
}

function PricingRuleForm({
  rule,
  roomTypes,
  idPrefix = "rule",
  onSubmit,
}: {
  rule?: PricingRule | null;
  roomTypes: RoomType[];
  idPrefix?: string;
  onSubmit: (payload: PricingRulePayload) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(rule ?? null));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleWeekday(day: number) {
    setForm((current) => ({
      ...current,
      weekdays: current.weekdays.includes(day)
        ? current.weekdays.filter((item) => item !== day)
        : [...current.weekdays, day],
    }));
  }

  async function handleSubmit() {
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit(toPayload(form));
      if (!rule) setForm(toFormState(null));
    } catch (err) {
      setFormError(getErrorMessage(err, "Lưu quy tắc giá thất bại"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}_name`}>Tên quy tắc</Label>
          <Input
            id={`${idPrefix}_name`}
            placeholder="Giảm giá mùa hè"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}_scope`}>Áp dụng cho</Label>
          <Select value={form.roomTypeId} onValueChange={(v) => update("roomTypeId", v ?? "all")}>
            <SelectTrigger id={`${idPrefix}_scope`} className="w-full">
              <SelectValue>
                {(current) =>
                  current === "all"
                    ? "Mọi loại phòng"
                    : (roomTypes.find((item) => String(item.id) === current)?.name ?? "")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi loại phòng</SelectItem>
              {roomTypes.map((roomType) => (
                <SelectItem key={roomType.id} value={String(roomType.id)}>
                  {roomType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}_recurrence`}>Kiểu áp dụng</Label>
          <Select value={form.recurrence} onValueChange={(v) => update("recurrence", v as PricingRecurrence)}>
            <SelectTrigger id={`${idPrefix}_recurrence`} className="w-full">
              <SelectValue>
                {(current) => RECURRENCE_LABELS[current as PricingRecurrence] ?? ""}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yearly">Lặp lại hằng năm</SelectItem>
              <SelectItem value="one_time">Áp dụng một lần</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}_priority`}>Độ ưu tiên</Label>
          <Input
            id={`${idPrefix}_priority`}
            type="number"
            min={0}
            max={1000}
            value={form.priority}
            onChange={(e) => update("priority", e.target.value)}
          />
        </div>
      </div>

      {form.recurrence === "one_time" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}_start_date`}>Ngày bắt đầu</Label>
            <DateField
              id={`${idPrefix}_start_date`}
              value={form.startDate}
              onChange={(value) => update("startDate", value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}_end_date`}>Ngày kết thúc</Label>
            <DateField
              id={`${idPrefix}_end_date`}
              value={form.endDate}
              onChange={(value) => update("endDate", value)}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}_start_day`}>Bắt đầu từ ngày / tháng</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`${idPrefix}_start_day`}
                type="number"
                min={1}
                max={31}
                placeholder="Ngày"
                value={form.startDay}
                onChange={(e) => update("startDay", e.target.value)}
              />
              <span className="text-muted-foreground">/</span>
              <Input
                type="number"
                min={1}
                max={12}
                placeholder="Tháng"
                aria-label="Tháng bắt đầu"
                value={form.startMonth}
                onChange={(e) => update("startMonth", e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}_end_day`}>Kết thúc ngày / tháng</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`${idPrefix}_end_day`}
                type="number"
                min={1}
                max={31}
                placeholder="Ngày"
                value={form.endDay}
                onChange={(e) => update("endDay", e.target.value)}
              />
              <span className="text-muted-foreground">/</span>
              <Input
                type="number"
                min={1}
                max={12}
                placeholder="Tháng"
                aria-label="Tháng kết thúc"
                value={form.endMonth}
                onChange={(e) => update("endMonth", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Chỉ áp dụng vào thứ</Label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_ORDER.map((day) => (
            <Button
              key={day}
              type="button"
              size="sm"
              variant={form.weekdays.includes(day) ? "default" : "outline"}
              onClick={() => toggleWeekday(day)}
            >
              {WEEKDAY_LABELS[day]}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Không chọn thứ nào nghĩa là áp dụng mọi ngày trong khoảng.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}_direction`}>Hướng điều chỉnh</Label>
          <Select value={form.direction} onValueChange={(v) => update("direction", v as AdjustmentDirection)}>
            <SelectTrigger id={`${idPrefix}_direction`} className="w-full">
              <SelectValue>
                {(current) => DIRECTION_LABELS[current as AdjustmentDirection] ?? ""}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="discount">Giảm giá</SelectItem>
              <SelectItem value="surcharge">Phụ thu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}_adjustment_type`}>Tính theo</Label>
          <Select value={form.adjustmentType} onValueChange={(v) => update("adjustmentType", v as DiscountType)}>
            <SelectTrigger id={`${idPrefix}_adjustment_type`} className="w-full">
              <SelectValue>
                {(current) => ADJUSTMENT_TYPE_LABELS[current as DiscountType] ?? ""}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Phần trăm (%)</SelectItem>
              <SelectItem value="fixed_amount">Số tiền cố định (VND)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}_adjustment_value`}>Mức điều chỉnh</Label>
          <Input
            id={`${idPrefix}_adjustment_value`}
            type="number"
            min={0}
            value={form.adjustmentValue}
            onChange={(e) => update("adjustmentValue", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}_description`}>Ghi chú</Label>
        <Input
          id={`${idPrefix}_description`}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}
      <Button onClick={handleSubmit} disabled={submitting || !isFormComplete(form)} className="self-start">
        {submitting ? "Đang lưu..." : rule ? "Lưu thay đổi" : "Tạo quy tắc"}
      </Button>
    </div>
  );
}

function EditPricingRuleDialog({
  rule,
  roomTypes,
  onClose,
  onSave,
}: {
  rule: PricingRule;
  roomTypes: RoomType[];
  onClose: () => void;
  onSave: (payload: PricingRulePayload) => Promise<void>;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sửa quy tắc giá</DialogTitle>
          <DialogDescription>Thay đổi có hiệu lực ngay với các ngày chưa đặt phòng.</DialogDescription>
        </DialogHeader>
        <PricingRuleForm rule={rule} roomTypes={roomTypes} idPrefix="edit_rule" onSubmit={onSave} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
