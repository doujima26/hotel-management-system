"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BedDouble, CalendarDays, Receipt } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, getRatingLabel } from "@/lib/utils/format";
import { reviewsApi } from "@/lib/api/reviews";
import { ApiError } from "@/types/api";
import type { RoomTypeReviewBreakdown, RoomTypeReviewBreakdownItem } from "@/types/models";
import { canOperate, useAdminHotel } from "../layout";

// Tinh so dem luu tru tu 2 moc ngay (chuoi YYYY-MM-DD) de hien kem khoang ngay.
function countNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

type ReviewSort = "newest" | "rating_desc" | "rating_asc";

const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "rating_desc", label: "Điểm cao đến thấp" },
  { value: "rating_asc", label: "Điểm thấp đến cao" },
];

// Style tooltip - dung dung token mau card/border cua theme, khong hardcode.
const tooltipContentStyle = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  fontSize: 12,
  padding: "8px 10px",
};

// Tooltip tu ve de gop du 3 thong tin trong 1 khung: diem, so luot va phan bo
// theo dai. Recharts truyen active/payload xuong component nay.
function RatingTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: RoomTypeReviewBreakdownItem }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const bands = [
    { label: "Cao (8-10)", count: item.high_count, color: "var(--success)" },
    { label: "Trung bình (6-7)", count: item.medium_count, color: "var(--warning)" },
    { label: "Thấp (1-5)", count: item.low_count, color: "var(--danger)" },
  ].filter((band) => band.count > 0);

  return (
    <div style={tooltipContentStyle}>
      <p className="font-semibold">{item.name}</p>
      <p>
        {item.avg_rating}/10 · {item.total_reviews} lượt
      </p>
      {bands.map((band) => (
        <p key={band.label} className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: band.color }} />
          {band.count} {band.label}
        </p>
      ))}
    </div>
  );
}

// Xep hang loai phong theo diem danh gia.
//
// Do dai thanh la DIEM (thang 10) chu khong phai so luot, vi cau hoi can tra loi
// la "loai phong nao dang duoc danh gia tot/xau". So luot de dang chu ben canh
// nen khong chiem mat kenh do dai.
//
// Moi thanh cung MOT mau: to dam nhat theo gia tri se ma hoa lap lai dung thu ma
// do dai thanh da the hien, trong khi thu hang da co san thu tu sap xep va con
// so. Mau chi dung khi no MANG NGHIA trang thai (so danh gia thap).
function RoomTypeRatingRanking({ data }: { data: RoomTypeReviewBreakdown }) {
  if (data.items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có đánh giá nào quy được về loại phòng.
        {data.unattributed_reviews > 0 &&
          ` Khách sạn đang có ${data.unattributed_reviews} đánh giá thuộc đơn không còn dòng phòng nào.`}
      </p>
    );
  }

  // Nhan dat o dau thanh gop luon so luot, de khong can them bang so ben duoi.
  const chartData = data.items.map((item) => ({
    ...item,
    label: `${item.avg_rating} · ${item.total_reviews} lượt`,
  }));
  const needAttention = data.items.filter((item) => item.low_count > 0 || item.medium_count > 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Truc X ep cung 0-10. Neu de Recharts tu chia thang theo du lieu thi
          chenh lech 8.0 va 9.0 se bi keo gian ra trong nhu mot khoang cach rat
          lon, doc sai hoan toan muc do chenh lech that. */}
      <ResponsiveContainer width="100%" height={Math.max(chartData.length * 48, 140)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 96, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "var(--foreground)" }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip cursor={{ fill: "var(--muted)" }} content={<RatingTooltip />} />
          {/* Moi thanh cung MOT mau: to dam nhat theo gia tri se ma hoa lap lai
              dung thu ma do dai thanh da the hien. */}
          <Bar dataKey="avg_rating" fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={22}>
            <LabelList
              dataKey="label"
              position="right"
              style={{ fontSize: 12, fill: "var(--foreground)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Chi len tieng khi that su co viec can lam - binh thuong khoi nay im lang. */}
      {needAttention.length > 0 && (
        <p className="text-sm text-warning-strong">
          Cần chú ý: {needAttention.map((item) => item.name).join(", ")} đang có đánh giá dưới 8 điểm.
        </p>
      )}
      {data.unattributed_reviews > 0 && (
        <p className="text-xs text-muted-foreground">
          {data.unattributed_reviews} đánh giá chưa quy được về loại phòng nào.
        </p>
      )}
    </div>
  );
}

export default function AdminReviewsPage() {
  const hotel = useAdminHotel();
  const canView = canOperate(hotel.status);

  const { data, isLoading, error } = useQuery({
    queryKey: ["hotel-reviews"],
    queryFn: () => reviewsApi.listForOwnHotel(),
    enabled: canView,
  });

  const breakdown = useQuery({
    queryKey: ["hotel-review-room-type-breakdown"],
    queryFn: () => reviewsApi.roomTypeBreakdownForOwnHotel(),
    enabled: canView,
  });

  const [sort, setSort] = useState<ReviewSort>("newest");

  // Sap xep ngay tren client: API da tra ve toan bo danh gia cua khach san (khong
  // phan trang) nen doi thu tu khong can goi lai server. Backend tra san theo
  // ngay moi nhat, nen "newest" giu nguyen thu tu do.
  const sortedReviews = useMemo(() => {
    if (!data) return [];
    if (sort === "newest") return data;
    const direction = sort === "rating_desc" ? -1 : 1;
    // Cung diem thi giu danh gia moi hon len truoc cho thu tu on dinh.
    return [...data].sort(
      (a, b) => direction * (a.rating - b.rating) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [data, sort]);

  if (!canView) {
    return <p className="text-muted-foreground">Khách sạn cần được duyệt trước khi xem đánh giá.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Đánh giá</h2>
        <p className="text-sm text-muted-foreground">Toàn bộ đánh giá của khách đã lưu trú tại khách sạn.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Đánh giá theo loại phòng</CardTitle>
          <CardDescription>
            Điểm trung bình thang 10, xếp từ cao đến thấp. Đơn nhiều loại phòng được tính cho tất cả loại phòng trong đơn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {breakdown.isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
          {breakdown.error && (
            <p className="text-sm text-destructive">
              {breakdown.error instanceof ApiError ? breakdown.error.message : "Không thể tải phân bố đánh giá"}
            </p>
          )}
          {breakdown.data && <RoomTypeRatingRanking data={breakdown.data} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Danh sách đánh giá</CardTitle>
              <CardDescription>
                {data ? `${data.length} đánh giá của khách đã lưu trú.` : "Đánh giá của khách đã lưu trú."}
              </CardDescription>
            </div>
            {data && data.length > 1 && (
              <Select value={sort} onValueChange={(v) => v && setSort(v as ReviewSort)}>
                <SelectTrigger className="w-52">
                  {/* Phai tu format: mac dinh SelectValue hien gia tri tho (ma sap xep). */}
                  <SelectValue>
                    {(current) => SORT_OPTIONS.find((opt) => opt.value === current)?.label ?? ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
          {error && (
            <p className="text-sm text-destructive">
              {error instanceof ApiError ? error.message : "Không thể tải danh sách đánh giá"}
            </p>
          )}

          {data && data.length === 0 && (
            <EmptyState
              title="Chưa có đánh giá nào"
              hint="Đánh giá sẽ xuất hiện ở đây sau khi khách trả phòng và đánh giá."
            />
          )}

          {sortedReviews.map((review) => (
            <div key={review.id} className="flex flex-col gap-3 rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{review.reviewer_name}</p>
                  <p className="text-sm text-muted-foreground">Đánh giá ngày {formatDate(review.created_at)}</p>
                </div>
                {/* Diem thang 10 kem nhan chu - cung mot cach hien nhu trang
                    cong khai, khong dung ngoi sao (ngoi sao la hang sao khach san). */}
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary px-2 py-0.5 text-sm font-bold text-primary-foreground">
                    {review.rating}
                  </span>
                  <span className="text-sm font-medium">{getRatingLabel(review.rating)}</span>
                </div>
              </div>

              {/* Thong tin lan luu tru bi danh gia - de Admin biet danh gia noi
                  ve don nao, loai phong nao ma khong phai tra cuu sang trang booking. */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Receipt className="size-3.5 text-muted-foreground" />
                  {review.booking_code}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {formatDate(review.check_in_date)} - {formatDate(review.check_out_date)} ·{" "}
                  {countNights(review.check_in_date, review.check_out_date)} đêm
                </span>
                {review.room_type_names.length > 0 && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <BedDouble className="size-3.5" />
                    {review.room_type_names.join(", ")}
                  </span>
                )}
              </div>

              {review.comment ? (
                <p className="rounded-lg border bg-muted/40 p-2.5 text-sm">{review.comment}</p>
              ) : (
                <p className="text-sm italic text-muted-foreground">Khách không để lại nhận xét.</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
