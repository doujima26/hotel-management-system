"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { cn } from "@/lib/utils";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/types/api";
import { type HotelStatus } from "@/types/enums";
import type { AdminHotelListItem } from "@/types/models";
import { HotelStatusBadge } from "@/components/shared/StatusBadge";

// Hang the trang thai o dau trang: vua cho thay phan bo toan nen tang, vua la
// bo loc. Thay cho dropdown cu - dropdown giau mat so luong nen phai bam lan
// luot tung muc moi biet nen tang dang co gi.
const STATUS_TABS: { value: HotelStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đang hoạt động" },
  { value: "suspended", label: "Tạm dừng" },
  { value: "rejected", label: "Từ chối" },
];

const SORT_OPTIONS: { value: "newest" | "lowest_rated" | "highest_rated" | "name"; label: string }[] = [
  { value: "newest", label: "Mới đăng ký" },
  { value: "lowest_rated", label: "Điểm thấp nhất" },
  { value: "highest_rated", label: "Điểm cao nhất" },
  { value: "name", label: "Tên A-Z" },
];

const ALL_CITIES = "__all__";

// Boc Suspense vi ben trong dung useSearchParams - dung khuyen nghi cua Next
// de phan con lai cua trang van duoc prerender.
export default function SuperAdminHotelsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Đang tải...</p>}>
      <SuperAdminHotelsContent />
    </Suspense>
  );
}

function SuperAdminHotelsContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // Mac dinh "Tat ca": mo trang ra la thay toan canh nen tang. Truoc day mac
  // dinh loc "Cho duyet" nen khi khong con ho so nao cho, trang mo ra trong tron.
  // Chi mo san mot bo loc khi duoc dieu huong kem tham so (tu Tong quan), va chi
  // nhan gia tri hop le de tham so bua khong bi gui thang len API.
  const statusParam = searchParams.get("status");
  const sortParam = searchParams.get("sort");
  const [statusFilter, setStatusFilter] = useState<HotelStatus | "all">(
    STATUS_TABS.some((tab) => tab.value === statusParam) ? (statusParam as HotelStatus | "all") : "all",
  );
  const [sort, setSort] = useState<"newest" | "lowest_rated" | "highest_rated" | "name">(
    SORT_OPTIONS.some((opt) => opt.value === sortParam) ? (sortParam as "newest" | "lowest_rated" | "highest_rated" | "name") : "newest",
  );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyHotelId, setBusyHotelId] = useState<number | null>(null);
  // Hop thoai nhap ly do, dung chung cho tu choi va tam dung.
  const [reasonTarget, setReasonTarget] = useState<{ hotel: AdminHotelListItem; action: "rejected" | "suspended" } | null>(
    null,
  );
  const [reason, setReason] = useState("");

  // Cho go xong moi goi API - go tung chu ma goi ngay se ban hang loat request.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-hotels", statusFilter, sort, search, city, page],
    queryFn: () =>
      adminApi.listHotels({
        status: statusFilter === "all" ? undefined : statusFilter,
        sort,
        search: search || undefined,
        city: city || undefined,
        page,
        page_size: 10,
      }),
    placeholderData: (previous) => previous,
  });

  async function handleReview(hotelId: number, action: "approved" | "rejected" | "suspended", reason?: string) {
    setActionError(null);
    setBusyHotelId(hotelId);
    try {
      await adminApi.reviewHotel(hotelId, { action, reason });
      toast.success("Cập nhật trạng thái khách sạn thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setBusyHotelId(null);
    }
  }

  function openReasonDialog(hotel: AdminHotelListItem, action: "rejected" | "suspended") {
    setReason("");
    setReasonTarget({ hotel, action });
  }

  async function confirmReasonAction() {
    if (!reasonTarget) return;
    await handleReview(reasonTarget.hotel.id, reasonTarget.action, reason.trim() || undefined);
    setReasonTarget(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Khách sạn trên nền tảng</h2>
        <p className="text-sm text-muted-foreground">
          Toàn bộ khách sạn, kèm chỉ số hoạt động 30 ngày gần nhất để thấy nơi nào cần chú ý.
        </p>
      </div>

      {/* Hang the trang thai: so dem lay tren TOAN nen tang nen khong doi khi
          dang loc - bam vao la loc, nhung van thay duoc buc tranh tong. */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? Object.values(data?.status_counts ?? {}).reduce((sum, value) => sum + value, 0)
              : (data?.status_counts?.[tab.value] ?? 0);
          const active = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary hover:text-primary",
              )}
            >
              <span>{tab.label}</span>
              <span className={cn("text-xs font-semibold tabular-nums", !active && "text-muted-foreground")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Tìm theo tên khách sạn"
          className="w-full sm:w-64"
        />
        {/* Bo loc khu vuc dung tu cac thanh pho THUC SU co khach san, khong
            liet ke ca 63 tinh - tranh bay ra hang chuc lua chon luon cho 0 ket qua. */}
        <Select
          value={city || ALL_CITIES}
          onValueChange={(v) => {
            setCity(!v || v === ALL_CITIES ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
            {/* Phai tu format: mac dinh SelectValue hien gia tri tho. */}
            <SelectValue>{(current) => (current === ALL_CITIES ? "Tất cả thành phố" : String(current))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CITIES}>Tất cả thành phố</SelectItem>
            {data?.cities.map((item) => (
              <SelectItem key={item.city} value={item.city}>
                {item.city} ({item.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => v && setSort(v as typeof sort)}>
          <SelectTrigger className="w-44">
            {/* Phai tu format: mac dinh SelectValue hien gia tri tho. */}
            <SelectValue>{(current) => SORT_OPTIONS.find((opt) => opt.value === current)?.label ?? ""}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải danh sách khách sạn"}
        </p>
      )}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="flex flex-col gap-3">
        {data?.items.map((hotel) => (
          <Card key={hotel.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  <Link href={`/super-admin/hotels/${hotel.id}`} className="hover:text-primary hover:underline">
                    {hotel.name}
                  </Link>
                </CardTitle>
                <HotelStatusBadge status={hotel.status} />
              </div>
              <CardDescription>
                {hotel.address}, {hotel.district ? `${hotel.district}, ` : ""}
                {hotel.city}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* Dai chi so: nhin phat biet khach san co hang de ban khong, khach
                  cham may diem, 30 ngay qua co ban duoc gi khong. */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-2.5 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Quy mô phòng</p>
                  <p className={cn("font-medium", hotel.room_count === 0 && "text-warning-strong")}>
                    {hotel.room_type_count} loại · {hotel.room_count} phòng
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Đánh giá</p>
                  <p className="font-medium">
                    {hotel.total_reviews > 0 ? (
                      <>
                        {hotel.avg_rating}/10{" "}
                        <span className="text-xs text-muted-foreground">({hotel.total_reviews})</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Chưa có</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">30 ngày</p>
                  <p className={cn("font-medium", hotel.bookings_30d === 0 && "text-warning-strong")}>
                    {hotel.bookings_30d} đơn · {formatMoney(hotel.revenue_30d)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tỷ lệ hủy</p>
                  <p
                    className={cn(
                      "font-medium",
                      hotel.cancel_rate_30d != null && hotel.cancel_rate_30d >= 0.3 && "text-danger-strong",
                    )}
                  >
                    {/* Khong co don nao thi ty le huy khong xac dinh, khong phai 0%. */}
                    {hotel.cancel_rate_30d != null ? formatPercent(hotel.cancel_rate_30d) : "—"}
                  </p>
                </div>
              </div>

              {(hotel.phone || hotel.email) && (
                <p className="text-sm text-muted-foreground">
                  {hotel.phone ?? ""}
                  {hotel.phone && hotel.email ? " - " : ""}
                  {hotel.email ?? ""}
                </p>
              )}
              {hotel.rejection_reason && (
                <p className="text-sm text-destructive">
                  {hotel.status === "suspended" ? "Lý do tạm dừng" : "Lý do từ chối"}: {hotel.rejection_reason}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {/* Xem ho so day du truoc khi quyet dinh - duyet ma khong xem la
                    dong dau mu, nen nut nay dat truoc cac nut hanh dong. */}
                <Link
                  href={`/super-admin/hotels/${hotel.id}`}
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                >
                  Xem hồ sơ
                </Link>
                {hotel.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleReview(hotel.id, "approved")}
                      disabled={busyHotelId === hotel.id}
                    >
                      Duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openReasonDialog(hotel, "rejected")}
                      disabled={busyHotelId === hotel.id}
                    >
                      Từ chối
                    </Button>
                  </>
                )}
                {hotel.status === "approved" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openReasonDialog(hotel, "suspended")}
                    disabled={busyHotelId === hotel.id}
                  >
                    Tạm dừng
                  </Button>
                )}
                {(hotel.status === "rejected" || hotel.status === "suspended") && (
                  <Button
                    size="sm"
                    onClick={() => handleReview(hotel.id, "approved")}
                    disabled={busyHotelId === hotel.id}
                  >
                    Duyệt lại
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {data && data.items.length === 0 && (
          <p className="text-center text-muted-foreground">Không có khách sạn nào khớp bộ lọc.</p>
        )}
      </div>

      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-50")}
          >
            Trước
          </button>
          <span className="text-sm text-muted-foreground">
            Trang {data.page} / {data.total_pages}
          </span>
          <button
            type="button"
            disabled={page >= data.total_pages}
            onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              page >= data.total_pages && "pointer-events-none opacity-50"
            )}
          >
            Sau
          </button>
        </div>
      )}

      <Dialog open={reasonTarget !== null} onOpenChange={(open) => !open && setReasonTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reasonTarget?.action === "suspended" ? "Tạm dừng khách sạn" : "Từ chối khách sạn"}
            </DialogTitle>
            <DialogDescription>
              {reasonTarget?.action === "suspended"
                ? `${reasonTarget.hotel.name} sẽ bị gỡ khỏi kết quả tìm kiếm và không nhận đơn mới. Đơn đã đặt vẫn được phục vụ bình thường.`
                : "Nhập lý do từ chối (sẽ hiển thị cho chủ khách sạn)."}
            </DialogDescription>
          </DialogHeader>

          {/* Canh bao so don chua tra phong khi tam dung. */}
          {reasonTarget?.action === "suspended" && reasonTarget.hotel.outstanding_bookings > 0 && (
            <p className="rounded-lg bg-warning-subtle px-3 py-2 text-sm text-warning-strong">
              Khách sạn còn <strong>{reasonTarget.hotel.outstanding_bookings} đơn chưa trả phòng</strong>. Khách đã đặt
              vẫn đến nhận phòng theo lịch, khách sạn vẫn phải phục vụ họ.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review_reason">Lý do</Label>
            <textarea
              id="review_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReasonAction}
              // Tam dung bat buoc phai co ly do.
              disabled={
                busyHotelId === reasonTarget?.hotel.id ||
                (reasonTarget?.action === "suspended" && !reason.trim())
              }
            >
              {reasonTarget?.action === "suspended" ? "Xác nhận tạm dừng" : "Xác nhận từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
