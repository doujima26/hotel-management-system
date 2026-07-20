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
