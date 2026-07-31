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

// Ngay kem gio phut - dung cho nhat ky, noi ma "hanh dong luc nao" moi la thong
// tin chinh nen chi ngay thoi la khong du.
export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${dateFormatter.format(date)} ${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
}

// Chi hien thang/nam - dung cho danh gia cong khai, du de khach biet lan luu tru
// gan day den dau ma khong tiet lo ngay o cu the cua nguoi danh gia.
export function formatMonthYear(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return monthYearFormatter.format(date);
}

// Nhan hien thi cho tung loai giuong. DB luu tu tieng Anh (Single/Queen/King...)
// theo quy uoc chung cua nganh, doi sang cach goi tieng Viet khi hien cho nguoi dung.
const BED_TYPE_LABELS: Record<string, string> = {
  Single: "giường đơn",
  Double: "giường đôi",
  Queen: "giường Queen",
  King: "giường King",
  Bunk: "giường tầng",
  Sofa: "giường sofa",
};

// Gop loai giuong va so luong thanh mot cum de doc: "2 giuong King". Tra null
// khi chua co loai giuong de noi goi tu an phan hien thi. Loai giuong la nhap
// tay tu truoc (khong nam trong danh sach chuan) thi hien nguyen van.
export function formatBedConfig(bedType: string | null, bedCount: number | null): string | null {
  if (!bedType) return null;
  const label = BED_TYPE_LABELS[bedType] ?? bedType;
  return bedCount ? `${bedCount} ${label}` : label;
}

// Nhan chu cho diem 10 - nguong tham khao theo quy uoc pho bien cua cac trang OTA.
export function getRatingLabel(score: number): string {
  if (score >= 9) return "Xuất sắc";
  if (score >= 8) return "Rất tốt";
  if (score >= 7) return "Tốt";
  if (score >= 6) return "Khá";
  return "Trung bình";
}
