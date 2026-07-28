// Lay ngay hom nay (theo gio dia phuong trinh duyet) dang YYYY-MM-DD, dung
// lam gia tri "min" cho input type=date de chan chon ngay qua khu.
export function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Cong them so ngay vao 1 chuoi ngay dang YYYY-MM-DD, tra ve cung dinh dang.
export function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(year, month - 1, day + days);
  const y = result.getFullYear();
  const m = String(result.getMonth() + 1).padStart(2, "0");
  const d = String(result.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Ngay dau tien cua thang chua 1 ngay bat ky, dang YYYY-MM-DD.
export function firstDayOfMonthString(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

// Ngay cuoi cung cua thang chua 1 ngay bat ky, dang YYYY-MM-DD.
export function lastDayOfMonthString(date: string): string {
  const [year, month] = date.split("-").map(Number);
  const result = new Date(year, month, 0);
  const y = result.getFullYear();
  const m = String(result.getMonth() + 1).padStart(2, "0");
  const d = String(result.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Cong/tru so thang vao 1 ngay dau-thang dang YYYY-MM-DD, tra ve dau thang moi.
export function addMonthsToDateString(date: string, months: number): string {
  const [year, month] = date.split("-").map(Number);
  const result = new Date(year, month - 1 + months, 1);
  const y = result.getFullYear();
  const m = String(result.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}
