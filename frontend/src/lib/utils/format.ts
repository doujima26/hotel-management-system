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

export function formatMoney(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return dateFormatter.format(date);
}

// Doi diem trung binh 5 sao (avg_rating) sang thang diem 10 kieu OTA de hien thi.
export function toTenPointScore(avgRating: number): number {
  return Math.round(avgRating * 2 * 10) / 10;
}

// Nhan chu cho diem 10 - nguong tham khao theo quy uoc pho bien cua cac trang OTA.
export function getRatingLabel(score: number): string {
  if (score >= 9) return "Xuất sắc";
  if (score >= 8) return "Rất tốt";
  if (score >= 7) return "Tốt";
  if (score >= 6) return "Khá";
  return "Trung bình";
}
