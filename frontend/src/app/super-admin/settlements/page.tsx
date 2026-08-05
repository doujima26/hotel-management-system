"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/types/api";
import type { HotelSettlement } from "@/types/models";

export default function SettlementsPage() {
  const queryClient = useQueryClient();
  const [payoutTarget, setPayoutTarget] = useState<HotelSettlement | null>(null);
  const [rateTarget, setRateTarget] = useState<HotelSettlement | null>(null);
  const [historyTarget, setHistoryTarget] = useState<HotelSettlement | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["settlements"],
    queryFn: () => adminApi.listSettlements(),
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["settlements"] });
  }

  const tongConNo = (data ?? []).reduce((sum, item) => sum + item.outstanding, 0);
  const tongHoaHong = (data ?? []).reduce((sum, item) => sum + item.total_commission, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Đối soát công nợ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nền tảng thu tiền của khách rồi trừ hoa hồng, phần còn lại là tiền của khách sạn. Việc chuyển
          khoản thực hiện ngoài hệ thống, sau đó ghi nhận lại ở đây để trừ công nợ.
        </p>
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải dữ liệu đối soát"}
        </p>
      )}

      {data && data.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tổng còn nợ khách sạn</CardDescription>
                <CardTitle className="text-2xl">{formatMoney(tongConNo)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tổng hoa hồng nền tảng</CardDescription>
                <CardTitle className="text-2xl">{formatMoney(tongHoaHong)}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Khách sạn</th>
                  <th className="px-4 py-3 text-right font-medium">Hoa hồng</th>
                  <th className="px-4 py-3 text-right font-medium">Đã thu</th>
                  <th className="px-4 py-3 text-right font-medium">Phải trả</th>
                  <th className="px-4 py-3 text-right font-medium">Đã chi</th>
                  <th className="px-4 py-3 text-right font-medium">Còn nợ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((item) => (
                  <tr key={item.hotel_id}>
                    <td className="px-4 py-3 font-medium">{item.hotel_name}</td>
                    <td className="px-4 py-3 text-right">{item.commission_rate}%</td>
                    <td className="px-4 py-3 text-right">{formatMoney(item.total_collected)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(item.payable)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(item.total_paid)}</td>
                    <td className="px-4 py-3 text-right">
                      <OutstandingCell value={item.outstanding} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setHistoryTarget(item)}>
                          Lịch sử
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRateTarget(item)}>
                          <Percent className="size-4" /> Hoa hồng
                        </Button>
                        <Button size="sm" onClick={() => setPayoutTarget(item)} disabled={item.outstanding <= 0}>
                          <Banknote className="size-4" /> Ghi chi trả
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data && data.length === 0 && (
        <EmptyState title="Chưa có khách sạn nào" hint="Khách sạn được duyệt sẽ xuất hiện ở đây." />
      )}

      <PayoutDialog target={payoutTarget} onClose={() => setPayoutTarget(null)} onSaved={refresh} />
      <CommissionDialog target={rateTarget} onClose={() => setRateTarget(null)} onSaved={refresh} />
      <PayoutHistoryDialog target={historyTarget} onClose={() => setHistoryTarget(null)} />
    </div>
  );
}

// Con no am nghia la nen tang da tra du: xay ra khi don bi huy va hoan tien SAU
// khi da chi tra. Phai noi ro thay vi hien so am tran, khong thi nguoi doc tuong
// he thong tinh sai.
function OutstandingCell({ value }: { value: number }) {
  if (value < 0) {
    return (
      <span className="text-amber-600" title="Nền tảng đã trả dư, sẽ bù trừ vào kỳ sau">
        {formatMoney(value)}
      </span>
    );
  }
  return <span className={value > 0 ? "font-medium" : "text-muted-foreground"}>{formatMoney(value)}</span>;
}

// Ghi nhan 1 dot da chuyen khoan cho khach san.
function PayoutDialog({
  target,
  onClose,
  onSaved,
}: {
  target: HotelSettlement | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setAmount("");
    setPeriodFrom("");
    setPeriodTo("");
    setReference("");
    setError(null);
    onClose();
  }

  async function handleSave() {
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.createPayout({
        hotel_id: target.hotel_id,
        amount: Number(amount),
        period_from: periodFrom || undefined,
        period_to: periodTo || undefined,
        reference: reference.trim() || undefined,
      });
      toast.success("Đã ghi nhận đợt chi trả");
      await onSaved();
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ghi nhận thất bại");
    } finally {
      setSaving(false);
    }
  }

  const soTien = Number(amount);
  const hopLe = soTien > 0 && target !== null && soTien <= target.outstanding;

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ghi nhận đợt chi trả</DialogTitle>
          <DialogDescription>
            {target && (
              <>
                Chuyển khoản cho <strong>{target.hotel_name}</strong> trước, rồi ghi lại ở đây. Đang nợ{" "}
                {formatMoney(target.outstanding)}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payout_amount">Số tiền đã chuyển</Label>
            <Input
              id="payout_amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {target && soTien > target.outstanding && (
              <p className="text-sm text-destructive">Vượt quá công nợ {formatMoney(target.outstanding)}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="period_from">Kỳ từ (không bắt buộc)</Label>
              <Input id="period_from" type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="period_to">Kỳ đến (không bắt buộc)</Label>
              <Input id="period_to" type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reference">Mã giao dịch (không bắt buộc)</Label>
            <Input
              id="reference"
              value={reference}
              placeholder="Mã FT của lệnh chuyển khoản"
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving || !hopLe}>
            {saving ? "Đang lưu..." : "Ghi nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Doi ty le hoa hong. Ty le moi chi ap cho don tao sau thoi diem doi.
function CommissionDialog({
  target,
  onClose,
  onSaved,
}: {
  target: HotelSettlement | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(open: boolean) {
    if (open) return;
    setRate("");
    setError(null);
    onClose();
  }

  async function handleSave() {
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.updateCommissionRate(target.hotel_id, Number(rate));
      toast.success("Đã cập nhật tỷ lệ hoa hồng");
      await onSaved();
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  }

  const soRate = Number(rate);
  const hopLe = rate !== "" && soRate >= 0 && soRate <= 100;

  return (
    <Dialog open={target !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tỷ lệ hoa hồng</DialogTitle>
          <DialogDescription>
            {target && (
              <>
                {target.hotel_name} — hiện tại {target.commission_rate}%. Tỷ lệ mới chỉ áp cho đơn đặt{" "}
                <strong>sau</strong> thời điểm đổi; đơn đã có giữ nguyên tỷ lệ cũ.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="commission_rate">Tỷ lệ mới (%)</Label>
          <Input
            id="commission_rate"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving || !hopLe}>
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Lich su cac dot da chi tra cho 1 khach san.
function PayoutHistoryDialog({ target, onClose }: { target: HotelSettlement | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["hotel-payouts", target?.hotel_id],
    queryFn: () => adminApi.listHotelPayouts(target!.hotel_id),
    enabled: target !== null,
  });

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lịch sử chi trả</DialogTitle>
          <DialogDescription>{target?.hotel_name}</DialogDescription>
        </DialogHeader>
        {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
        {data && data.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có đợt chi trả nào.</p>
        )}
        {data && data.length > 0 && (
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {data.map((payout) => (
              <div key={payout.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{formatMoney(payout.amount)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(payout.created_at)}</span>
                </div>
                {payout.period_from && payout.period_to && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Kỳ {formatDate(payout.period_from)} - {formatDate(payout.period_to)}
                  </p>
                )}
                {payout.reference && (
                  <p className="mt-1 text-xs text-muted-foreground">Mã giao dịch: {payout.reference}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
