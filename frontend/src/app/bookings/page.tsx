"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { AccountShell } from "@/components/shared/AccountShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { bookingsApi } from "@/lib/api/bookings";

import { ApiError } from "@/types/api";
import { BookingStatusBadge } from "@/components/shared/StatusBadge";

export default function BookingsPage() {
  return (
    <RequireAuth allow={["user"]}>
      <AccountShell>
        <BookingsList />
      </AccountShell>
    </RequireAuth>
  );
}

function BookingsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => bookingsApi.listMine(),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Đơn đặt phòng</h1>
      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải danh sách booking"}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {data?.map((booking) => (
          <Link key={booking.id} href={`/bookings/${booking.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{booking.booking_code}</CardTitle>
                  <BookingStatusBadge status={booking.status} />
                </div>
                <CardDescription>
                  {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Tổng tiền: {formatMoney(booking.total_amount)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {data && data.length === 0 && <p className="text-center text-muted-foreground">Bạn chưa có booking nào.</p>}
      </div>
    </div>
  );
}
