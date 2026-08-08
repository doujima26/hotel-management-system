import { Skeleton } from "@/components/ui/skeleton";

// Hien khi Next.js dang cho HotelDetailPage tai lai (doi ngay nhan/tra phong
// o form tim kiem cung la 1 lan router.push sang URL moi, chinh trang nay).
export default function HotelDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <Skeleton className="h-4 w-72" />

      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-2/3 sm:h-9" />
        <Skeleton className="h-4 w-1/3" />
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        <Skeleton className="col-span-4 h-64 rounded-xl sm:col-span-3 sm:h-96" />
        <div className="col-span-4 grid grid-cols-4 gap-2 sm:col-span-2 sm:grid-cols-2 sm:gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg sm:h-[11.5rem]" />
          ))}
        </div>
      </div>

      <Skeleton className="h-20 w-full rounded-xl" />

      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
