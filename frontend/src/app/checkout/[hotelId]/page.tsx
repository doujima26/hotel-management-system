"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Building2, Check } from "lucide-react";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatMoney, getRatingLabel } from "@/lib/utils/format";
import { apiFetch } from "@/lib/api/client";
import { bookingsApi, type BankTransferInfo } from "@/lib/api/bookings";
import { BankTransferPanel } from "@/components/shared/BankTransferPanel";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/types/api";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/types/enums";
import type {
  Booking,
  HotelDetail,
  HotelServiceItem,
  PayBookingResult,
  Promotion,
  RoomAvailability,
  RoomTypeAvailability,
} from "@/types/models";

const NO_PROMOTION_VALUE = "none";
const STEPS = ["Thông tin & dịch vụ", "Thanh toán", "Hoàn tất"];

// Tinh truoc so tien giam de hien thi preview - khop cong thuc backend
// booking_service.py::_apply_promotion (nguon xac nhan cuoi cung).
function calcPromotionDiscount(promotion: Promotion, totalRoomPrice: number): number {
  let discount =
    promotion.discount_type === "percentage"
      ? (totalRoomPrice * promotion.discount_value) / 100
      : promotion.discount_value;
  if (promotion.max_discount_amount != null) {
    discount = Math.min(discount, promotion.max_discount_amount);
  }
  return Math.min(discount, totalRoomPrice);
}

interface CheckoutPageProps {
  params: Promise<{ hotelId: string }>;
  searchParams: Promise<{
    rooms?: string;
    room_type_id?: string;
    check_in?: string;
    check_out?: string;
    num_guests?: string;
  }>;
}

// Doc lua chon phong tu URL. Dang moi: "rooms=<id>:<qty>,<id>:<qty>" (chon nhieu
// loai phong); van chap nhan dang cu "room_type_id=<id>" cho link cu.
function parseRoomSelection(rooms: string | undefined, legacyRoomTypeId: string | undefined) {
  if (rooms) {
    return rooms
      .split(",")
      .map((part) => {
        const [id, qty] = part.split(":");
        return { room_type_id: Number(id), quantity: Number(qty) || 1 };
      })
      .filter((row) => Number.isFinite(row.room_type_id) && row.room_type_id > 0 && row.quantity > 0);
  }
  const legacyId = Number(legacyRoomTypeId ?? "0");
  return legacyId > 0 ? [{ room_type_id: legacyId, quantity: 1 }] : [];
}

export default function CheckoutPage(props: CheckoutPageProps) {
  return (
    <RequireAuth allow={["user"]}>
      <CheckoutContent {...props} />
    </RequireAuth>
  );
}

function CheckoutContent({ params, searchParams }: CheckoutPageProps) {
  const { hotelId } = use(params);
  const query = use(searchParams);
  const id = Number(hotelId);
  const checkIn = query.check_in ?? "";
  const checkOut = query.check_out ?? "";
  const numGuests = query.num_guests ? Number(query.num_guests) : 1;
  const roomSelection = parseRoomSelection(query.rooms, query.room_type_id);

  const { user } = useAuth();

  const [serviceQty, setServiceQty] = useState<Record<number, number>>({});
  const [specialRequests, setSpecialRequests] = useState("");
  const [promotionId, setPromotionId] = useState(NO_PROMOTION_VALUE);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit_card");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [atPaymentStep, setAtPaymentStep] = useState(false);
  const [payResult, setPayResult] = useState<PayBookingResult | null>(null);
  // Chi co khi chon chuyen khoan: don da tao va dang cho tien ve.
  const [bankTransfer, setBankTransfer] = useState<BankTransferInfo | null>(null);
  const [payingLoading, setPayingLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const hotelQuery = useQuery({
    queryKey: ["hotel-detail", id],
    queryFn: () => apiFetch<HotelDetail>(`/hotels/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });

  const availabilityQuery = useQuery({
    queryKey: ["room-availability", id, checkIn, checkOut, numGuests],
    queryFn: () =>
      apiFetch<RoomAvailability>("/rooms/availability", {
        params: { hotel_id: id, check_in: checkIn, check_out: checkOut, num_guests: numGuests },
      }),
    enabled: Boolean(id && checkIn && checkOut),
  });

  const promotionsQuery = useQuery({
    queryKey: ["hotel-promotions", id],
    queryFn: () => apiFetch<Promotion[]>(`/hotels/${id}/promotions`),
    enabled: Number.isFinite(id) && id > 0,
  });

  const servicesQuery = useQuery({
    queryKey: ["hotel-services-public", id],
    queryFn: () => apiFetch<HotelServiceItem[]>(`/hotels/${id}/services`),
    enabled: Number.isFinite(id) && id > 0,
  });

  const hotel = hotelQuery.data;
  // Ghep lua chon tu URL voi du lieu phong trong de lay ten/gia thuc te.
  const selectedRooms = roomSelection
    .map((row) => ({
      room: availabilityQuery.data?.items.find((item) => item.room_type_id === row.room_type_id),
      quantity: row.quantity,
    }))
    .filter((row): row is { room: RoomTypeAvailability; quantity: number } => Boolean(row.room));
  const totalRoomCount = selectedRooms.reduce((sum, row) => sum + row.quantity, 0);

  const numNights =
    checkIn && checkOut
      ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000))
      : 0;
  const totalRoomPrice = selectedRooms.reduce(
    (sum, row) => sum + row.room.base_price * row.quantity * numNights,
    0,
  );

  const selectedServices = (servicesQuery.data ?? [])
    .map((service) => ({ service, qty: serviceQty[service.id] ?? 0 }))
    .filter((row) => row.qty > 0);
  const totalServicePrice = selectedServices.reduce((sum, row) => sum + row.service.price * row.qty, 0);

  const eligiblePromotions = (promotionsQuery.data ?? []).filter(
    (promo) => promo.min_booking_amount == null || totalRoomPrice >= promo.min_booking_amount
  );
  const selectedPromotion = eligiblePromotions.find((promo) => String(promo.id) === promotionId);
  const discountAmount = selectedPromotion ? calcPromotionDiscount(selectedPromotion, totalRoomPrice) : 0;
  const previewTotal = totalRoomPrice + totalServicePrice - discountAmount;

  const currentStep = payResult || bankTransfer ? 2 : atPaymentStep ? 1 : 0;
  const primaryImage = hotel?.images.find((img) => img.is_primary) ?? hotel?.images[0];
  const score = hotel && hotel.total_reviews > 0 ? hotel.avg_rating : null;

  if (roomSelection.length === 0 || !checkIn || !checkOut) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-muted-foreground">
        Thiếu thông tin đặt phòng. Vui lòng chọn phòng từ trang chi tiết khách sạn.
        <div className="mt-4">
          <Link href={`/hotels/${id}`} className="text-primary underline-offset-4 hover:underline">
            Quay lại trang khách sạn
          </Link>
        </div>
      </div>
    );
  }

  function setServiceQuantity(serviceId: number, value: number) {
    setServiceQty((prev) => ({ ...prev, [serviceId]: Math.max(0, value) }));
  }

  // Buoc 1 chi chuyen man hinh, khong ghi gi vao co so du lieu - don va phong
  // chi duoc giu khi khach thuc su hoan tat thanh toan o buoc 2.
  function goToPaymentStep() {
    setFormError(null);
    setAtPaymentStep(true);
  }

  async function handleCheckout() {
    setFormError(null);
    setPayingLoading(true);
    try {
      const result = await bookingsApi.checkout({
        hotel_id: id,
        check_in_date: checkIn,
        check_out_date: checkOut,
        num_guests: numGuests,
        rooms: selectedRooms.map((row) => ({ room_type_id: row.room.room_type_id, quantity: row.quantity })),
        services: selectedServices.map((row) => ({ service_id: row.service.id, quantity: row.qty })),
        special_requests: specialRequests || undefined,
        promotion_id: selectedPromotion?.id,
        payment_method: paymentMethod,
      });
      setBooking(result.booking);
      if (result.bank_transfer) {
        // Chuyen khoan: don da giu phong nhung chua tra tien, chuyen sang man
        // hinh quet QR thay vi man hinh thanh cong.
        setBankTransfer(result.bank_transfer);
        toast.success("Đã giữ phòng, vui lòng chuyển khoản để hoàn tất");
      } else if (result.payment && result.invoice) {
        setPayResult({ payment: result.payment, invoice: result.invoice });
        toast.success("Đặt phòng thành công!");
      }
    } catch (err) {
      setFormError(getErrorMessage(err, "Đặt phòng thất bại"));
    } finally {
      setPayingLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Stepper */}
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                index <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {index < currentStep ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className={index === currentStep ? "font-semibold" : "text-muted-foreground"}>{label}</span>
            {index < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr] lg:items-start">
        {/* Cot trai: tom tat (sticky) */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          <div className="overflow-hidden rounded-xl border">
            <div className="h-36 w-full bg-muted">
              {primaryImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primaryImage.image_url} alt={hotel?.name ?? ""} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Building2 className="size-8" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 p-3">
              <p className="font-semibold">{hotel?.name ?? "Đặt phòng"}</p>
              {hotel && (
                <p className="text-xs text-muted-foreground">
                  {hotel.address}, {hotel.district ? `${hotel.district}, ` : ""}
                  {hotel.city}
                </p>
              )}
              {score != null && (
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  <span className="rounded bg-primary px-1.5 py-0.5 font-bold text-primary-foreground">
                    {score.toFixed(1)}
                  </span>
                  <span className="font-medium">{getRatingLabel(score)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border p-3 text-sm">
            <p className="mb-2 font-medium">Chi tiết đặt phòng</p>
            <div className="flex justify-between text-muted-foreground">
              <span>Nhận phòng</span>
              <span className="font-medium text-foreground">{formatDate(checkIn)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Trả phòng</span>
              <span className="font-medium text-foreground">{formatDate(checkOut)}</span>
            </div>
            <div className="mt-1 text-muted-foreground">
              {numNights} đêm · {totalRoomCount} phòng · {numGuests} khách
            </div>
          </div>

          {(totalRoomPrice > 0 || booking) && (
            <div className="rounded-xl border p-3 text-sm">
              <p className="mb-2 font-medium">Tóm tắt giá</p>
              <div className="flex justify-between text-muted-foreground">
                <span>Tiền phòng</span>
                <span>{formatMoney(booking?.total_room_price ?? totalRoomPrice)}</span>
              </div>
              {(booking?.total_service_price ?? totalServicePrice) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Dịch vụ</span>
                  <span>{formatMoney(booking?.total_service_price ?? totalServicePrice)}</span>
                </div>
              )}
              {(booking?.discount_amount ?? discountAmount) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Giảm giá</span>
                  <span>-{formatMoney(booking?.discount_amount ?? discountAmount)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
                <span>Tổng cộng</span>
                <span>{formatMoney(booking?.total_amount ?? previewTotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Đã gồm thuế &amp; phí</p>
            </div>
          )}

          {hotel?.cancellation_policy && (
            <div className="rounded-xl border p-3 text-sm">
              <p className="mb-1 font-medium">Chính sách hủy</p>
              <p className="text-muted-foreground">{hotel.cancellation_policy}</p>
            </div>
          )}
        </aside>

        {/* Cot phai: noi dung tung buoc */}
        <div className="flex flex-col gap-5">
          {bankTransfer && booking ? (
            <BankTransferPanel
              bookingId={booking.id}
              bookingCode={booking.booking_code}
              hotelId={booking.hotel_id}
              info={bankTransfer}
            />
          ) : payResult && booking ? (
            <SuccessPanel booking={booking} payResult={payResult} />
          ) : atPaymentStep ? (
            <PaymentPanel
              totalAmount={previewTotal}
              paymentMethod={paymentMethod}
              onChangeMethod={setPaymentMethod}
              onPay={handleCheckout}
              onBack={() => setAtPaymentStep(false)}
              loading={payingLoading}
              error={formError}
            />
          ) : (
            <>
              {/* Thong tin cua ban */}
              <section className="rounded-xl border p-4">
                <h2 className="mb-3 text-lg font-semibold">Thông tin của bạn</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Họ tên</p>
                    <p className="text-sm font-medium">{user?.full_name ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{user?.email ?? "-"}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Đơn đặt phòng gắn với tài khoản của bạn. Cập nhật thông tin ở trang Tài khoản nếu cần.
                </p>
              </section>

              {/* Phong */}
              <section className="rounded-xl border p-4">
                <h2 className="mb-3 text-lg font-semibold">Phòng đã chọn</h2>
                {availabilityQuery.isLoading && <p className="text-sm text-muted-foreground">Đang tải thông tin phòng...</p>}
                {!availabilityQuery.isLoading && selectedRooms.length === 0 && (
                  <p className="text-sm text-destructive">Không tìm thấy loại phòng đã chọn hoặc đã hết phòng trống.</p>
                )}
                {selectedRooms.length > 0 && (
                  <div className="flex flex-col divide-y">
                    {selectedRooms.map((row) => (
                      <div
                        key={row.room.room_type_id}
                        className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div>
                          <p className="font-medium">
                            {row.room.name} <span className="text-muted-foreground">× {row.quantity}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatMoney(row.room.base_price)}/đêm
                            {row.quantity > row.room.available_rooms
                              ? ` · chỉ còn ${row.room.available_rooms} phòng`
                              : ""}
                          </p>
                        </div>
                        <p className="font-semibold">
                          {formatMoney(row.room.base_price * row.quantity * numNights)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Muốn đổi phòng?{" "}
                  <Link href={`/hotels/${id}`} className="text-primary hover:underline">
                    Quay lại chọn phòng
                  </Link>
                </p>
              </section>

              {/* Them dich vu */}
              {servicesQuery.data && servicesQuery.data.length > 0 && (
                <section className="rounded-xl border p-4">
                  <h2 className="mb-1 text-lg font-semibold">Thêm dịch vụ</h2>
                  <p className="mb-3 text-sm text-muted-foreground">Chọn thêm dịch vụ cho kỳ nghỉ (không bắt buộc).</p>
                  <div className="flex flex-col divide-y">
                    {servicesQuery.data.map((service) => {
                      const qty = serviceQty[service.id] ?? 0;
                      return (
                        <div key={service.id} className="flex items-center justify-between gap-3 py-2.5">
                          <label className="flex flex-1 items-center gap-2.5">
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              checked={qty > 0}
                              onChange={(e) => setServiceQuantity(service.id, e.target.checked ? 1 : 0)}
                            />
                            <span>
                              <span className="text-sm font-medium">{service.name}</span>
                              <span className="block text-xs text-muted-foreground">
                                {formatMoney(service.price)}
                                {service.unit ? ` / ${service.unit}` : ""}
                              </span>
                            </span>
                          </label>
                          {qty > 0 && (
                            <Input
                              type="number"
                              min={1}
                              value={qty}
                              onChange={(e) => setServiceQuantity(service.id, Number(e.target.value) || 1)}
                              className="w-20"
                              aria-label={`Số lượng ${service.name}`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Yeu cau + khuyen mai */}
              <section className="rounded-xl border p-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="special_requests">Yêu cầu đặc biệt (không bắt buộc)</Label>
                  <textarea
                    id="special_requests"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
                {promotionsQuery.data && promotionsQuery.data.length > 0 && (
                  <div className="mt-4 flex flex-col gap-1.5">
                    <Label htmlFor="promotion">Khuyến mãi (không bắt buộc)</Label>
                    <Select value={promotionId} onValueChange={(v) => setPromotionId(v ?? NO_PROMOTION_VALUE)}>
                      <SelectTrigger id="promotion" className="w-full">
                        {/* Phai tu format: mac dinh SelectValue hien gia tri tho (id khuyen mai). */}
                        <SelectValue>
                          {(current) =>
                            promotionsQuery.data?.find((promo) => String(promo.id) === current)?.name ??
                            "Không áp dụng"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_PROMOTION_VALUE}>Không áp dụng</SelectItem>
                        {promotionsQuery.data.map((promo) => {
                          const eligible = eligiblePromotions.some((p) => p.id === promo.id);
                          return (
                            <SelectItem key={promo.id} value={String(promo.id)} disabled={!eligible}>
                              {promo.name} -{" "}
                              {promo.discount_type === "percentage"
                                ? `${promo.discount_value}%`
                                : formatMoney(promo.discount_value)}
                              {!eligible && promo.min_booking_amount != null
                                ? ` (đơn tối thiểu ${formatMoney(promo.min_booking_amount)})`
                                : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {selectedPromotion?.description && (
                      <p className="text-xs text-muted-foreground">{selectedPromotion.description}</p>
                    )}
                  </div>
                )}
              </section>

              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <Button
                onClick={goToPaymentStep}
                disabled={selectedRooms.length === 0}
                className="self-end rounded-full"
              >
                Tiếp tục: Thanh toán
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Buoc 2: thanh toan (mock - chi chon phuong thuc, khong nhap thong tin the).
// Chua co ma don o buoc nay: don chi duoc tao khi bam hoan tat.
function PaymentPanel({
  totalAmount,
  paymentMethod,
  onChangeMethod,
  onPay,
  onBack,
  loading,
  error,
}: {
  totalAmount: number;
  paymentMethod: PaymentMethod;
  onChangeMethod: (method: PaymentMethod) => void;
  onPay: () => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="rounded-xl border p-4">
      <h2 className="text-lg font-semibold">Thanh toán</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tổng tiền <span className="font-medium text-foreground">{formatMoney(totalAmount)}</span>
      </p>
      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor="payment_method">Phương thức thanh toán</Label>
        <Select value={paymentMethod} onValueChange={(v) => onChangeMethod(v as PaymentMethod)}>
          <SelectTrigger id="payment_method" className="w-full">
            {/* Phai tu format: mac dinh SelectValue hien gia tri tho (ma phuong thuc). */}
            <SelectValue>
              {(current) => PAYMENT_METHOD_LABELS[current as PaymentMethod] ?? "Chọn phương thức"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
              <SelectItem key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        * Đây là thanh toán mô phỏng cho mục đích trình diễn, không thu tiền thật. Phòng chỉ được giữ sau khi bạn
        hoàn tất thanh toán.
      </p>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <Button onClick={onPay} disabled={loading} className="mt-4 w-full rounded-full">
        {loading ? "Đang xử lý..." : `Hoàn tất đặt phòng · ${formatMoney(totalAmount)}`}
      </Button>
      <Button variant="ghost" onClick={onBack} disabled={loading} className="mt-2 w-full rounded-full">
        Quay lại chỉnh sửa
      </Button>
    </section>
  );
}

// Buoc 3: thanh cong.
function SuccessPanel({ booking, payResult }: { booking: Booking; payResult: PayBookingResult }) {
  return (
    <section className="flex flex-col items-center gap-4 rounded-xl border p-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-green-100 text-green-700">
        <BadgeCheck className="size-8" />
      </span>
      <h1 className="text-2xl font-bold">Đặt phòng thành công!</h1>
      <p className="text-muted-foreground">
        Hóa đơn {payResult.invoice.invoice_number} · Tổng tiền {formatMoney(payResult.invoice.total_amount)}. Đơn đang
        chờ khách sạn xác nhận, bạn sẽ nhận thông báo qua email khi được xác nhận.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href={`/bookings/${booking.id}`} className="text-primary underline-offset-4 hover:underline">
          Xem chi tiết đơn
        </Link>
        <Link href="/bookings" className="text-primary underline-offset-4 hover:underline">
          Đơn đặt phòng của tôi
        </Link>
      </div>
    </section>
  );
}
