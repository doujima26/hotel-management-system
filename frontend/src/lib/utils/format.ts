const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const monthYearFormatter = new Intl.DateTimeFormat("vi-VN", {
  month: "long",
  year: "numeric",
});

export function formatMoney(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return dateFormatter.format(date);
}

// Chi hien thang/nam - dung cho danh gia cong khai, du de khach biet lan luu tru
// gan day den dau ma khong tiet lo ngay o cu the cua nguoi danh gia.
export function formatMonthYear(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return monthYearFormatter.format(date);
}

// Nhan chu cho diem 10 - nguong tham khao theo quy uoc pho bien cua cac trang OTA.
export function getRatingLabel(score: number): string {
  if (score >= 9) return "Xuất sắc";
  if (score >= 8) return "Rất tốt";
  if (score >= 7) return "Tốt";
  if (score >= 6) return "Khá";
  return "Trung bình";
}
