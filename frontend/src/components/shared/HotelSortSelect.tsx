"use client";

import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Danh sach cach sap xep, gia tri phai khop enum HotelSortOption cua backend.
const SORT_OPTIONS = [
  { value: "recommended", label: "Đề xuất cho bạn" },
  { value: "price_asc", label: "Giá: Thấp đến cao" },
  { value: "price_desc", label: "Giá: Cao đến thấp" },
  { value: "rating_desc", label: "Đánh giá cao nhất" },
  { value: "star_desc", label: "Hạng sao: Cao đến thấp" },
  { value: "star_asc", label: "Hạng sao: Thấp đến cao" },
] as const;

interface HotelSortSelectProps {
  value: string;
  // Cac filter can giu lai khi doi cach sap xep (city, check_in, cac bo loc...),
  // dang mang cap [key, value] de giu duoc param lap lai (stars, districts...).
  // Khong bao gom "sort" va "page". Trang cha truyen xuong de khong phai dung
  // useSearchParams (tranh yeu cau Suspense).
  preserved: [string, string][];
}

// Dropdown sap xep ket qua tim kiem - client component vi can dieu huong URL,
// giu nguyen cac filter khac va reset ve trang 1 khi doi cach sap xep.
export function HotelSortSelect({ value, preserved }: HotelSortSelectProps) {
  const router = useRouter();

  function handleChange(next: string | null) {
    if (!next) return;
    const params = new URLSearchParams(preserved);
    if (next !== "recommended") {
      params.set("sort", next);
    }
    const query = params.toString();
    router.push(query ? `/hotels?${query}` : "/hotels");
  }

  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="size-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Sắp xếp:</span>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-56">
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
    </div>
  );
}
