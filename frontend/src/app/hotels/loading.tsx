import { Skeleton } from "@/components/ui/skeleton";

// Hien khi Next.js dang cho HotelsPage (Server Component) tai lai du lieu -
// xay ra moi lan doi bo loc/sap xep/trang vi cac thao tac do deu la router.push
// sang URL moi, khong phai fetch phia client. Khong co file nay thi trang dung
// im hoan toan cho toi khi du lieu moi ve.
export default function HotelsLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <Skeleton className="h-24 w-full rounded-[1.75rem] sm:h-20" />

      <Skeleton className="h-4 w-64" />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-col gap-6 lg:w-64 lg:shrink-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="h-4 w-28" />
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-56" />
          </div>

          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-4 rounded-xl border p-3 sm:flex-row sm:p-4">
                <Skeleton className="h-44 w-full shrink-0 rounded-lg sm:h-auto sm:w-56" />
                <div className="flex flex-1 flex-col justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <div className="flex items-end justify-between gap-3">
                    <Skeleton className="h-4 w-24" />
                    <div className="ml-auto flex flex-col items-end gap-1.5">
                      <Skeleton className="h-6 w-28" />
                      <Skeleton className="h-8 w-28 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
