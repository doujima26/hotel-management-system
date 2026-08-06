"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";
import { formatMoney } from "@/lib/utils/format";
import { bookingsApi, type BankTransferInfo } from "@/lib/api/bookings";

interface BankTransferPanelProps {
  bookingId: number;
  bookingCode: string;
  hotelId: number;
  info: BankTransferInfo;
}

// Man hinh quet ma QR chuyen khoan, dem nguoc han giu phong va hoi lai trang
// thai don cho toi khi ngan hang bao tien da ve.
//
// KHONG co nut "Toi da thanh toan": trinh duyet khong phai ben co tham quyen
// xac nhan tien - chi webhook tu ngan hang moi noi duoc dieu do.
//
// Dung chung cho 2 noi: ngay sau khi dat phong (trang checkout) va khi khach
// quay lai don chua tra tien (trang chi tiet don). Man hinh nay tung chi ton tai
// trong bo nho trang checkout, nen tai lai trang la khach mat duong quay lai
// trong khi don van dang giu phong.
export function BankTransferPanel({ bookingId, bookingCode, hotelId, info }: BankTransferPanelProps) {
  const [conLai, setConLai] = useState(() =>
    Math.max(0, Math.floor((new Date(info.expires_at).getTime() - Date.now()) / 1000)),
  );

  const { data: donMoiNhat } = useQuery({
    queryKey: ["booking-payment-status", bookingId],
    queryFn: () => bookingsApi.getDetail(bookingId),
    // Hoi lai moi 5 giay, dung han khi da nhan duoc tien hoac het han giu phong.
    refetchInterval: (query) => (query.state.data?.payment_status === "completed" || conLai <= 0 ? false : 5000),
  });

  useEffect(() => {
    if (conLai <= 0) return;
    const dongHo = setInterval(() => setConLai((truoc) => Math.max(0, truoc - 1)), 1000);
    return () => clearInterval(dongHo);
  }, [conLai]);

  const daThanhToan = donMoiNhat?.payment_status === "completed";
  const hetHan = conLai <= 0 && !daThanhToan;

  if (daThanhToan) {
    return (
      <section className="flex flex-col items-center gap-4 rounded-xl border p-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <BadgeCheck className="size-8" />
        </span>
        <h2 className="text-2xl font-bold">Đã nhận được thanh toán!</h2>
        <p className="text-muted-foreground">
          Đơn {bookingCode} đang chờ khách sạn xác nhận. Bạn sẽ nhận thông báo qua email khi được xác nhận.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/bookings/${bookingId}`} className="text-primary underline-offset-4 hover:underline">
            Xem chi tiết đơn
          </Link>
          <Link href="/bookings" className="text-primary underline-offset-4 hover:underline">
            Đơn đặt phòng của tôi
          </Link>
        </div>
      </section>
    );
  }

  if (hetHan) {
    return (
      <section className="flex flex-col items-center gap-4 rounded-xl border p-8 text-center">
        <h2 className="text-2xl font-bold">Đã hết hạn giữ phòng</h2>
        <p className="text-muted-foreground">
          Chúng tôi chưa nhận được thanh toán nên phòng đã được mở bán lại. Nếu bạn vừa chuyển khoản, tiền sẽ
          được hoàn lại — vui lòng liên hệ để được hỗ trợ.
        </p>
        <Link href={`/hotels/${hotelId}`} className="text-primary underline-offset-4 hover:underline">
          Đặt lại
        </Link>
      </section>
    );
  }

  const phut = Math.floor(conLai / 60);
  const giay = conLai % 60;

  return (
    <section className="flex flex-col items-center gap-4 rounded-xl border p-8 text-center">
      <h2 className="text-2xl font-bold">Quét mã để hoàn tất thanh toán</h2>
      <p className="text-muted-foreground">
        Phòng đang được giữ cho bạn. Còn{" "}
        <strong className="text-foreground">
          {phut}:{String(giay).padStart(2, "0")}
        </strong>
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={info.qr_url} alt="Mã QR chuyển khoản" className="size-64 rounded-lg border object-contain" />

      <dl className="w-full max-w-sm text-left text-sm">
        <div className="flex justify-between border-b py-2">
          <dt className="text-muted-foreground">Số tiền</dt>
          <dd className="font-semibold">{formatMoney(info.amount)}</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt className="text-muted-foreground">Số tài khoản</dt>
          <dd className="font-mono">{info.account_number}</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-muted-foreground">Nội dung</dt>
          <dd className="font-mono font-semibold">{info.payment_code}</dd>
        </div>
      </dl>

      <p className="max-w-md text-sm text-muted-foreground">
        Giữ nguyên nội dung chuyển khoản. Hệ thống tự nhận khi tiền về, bạn không cần bấm gì thêm.
      </p>
    </section>
  );
}
