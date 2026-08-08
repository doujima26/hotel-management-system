import { Skeleton } from "@/components/ui/skeleton";

// Hien khi dieu huong VE trang chu (vd bam "Trang chu" tu /hotels) trong luc
// Home (Server Component) dang goi lai 3 API uu dai/khach san noi bat.
export default function HomeLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="relative h-[440px] w-full overflow-hidden bg-muted sm:h-[500px] md:h-[560px]" />

      <div className="mx-auto -mt-16 w-full max-w-6xl px-4 sm:-mt-20">
        <Skeleton className="h-40 w-full rounded-[1.75rem] sm:h-24" />
      </div>

      <section className="mt-16 sm:mt-20">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-16">
          <Skeleton className="h-6 w-56" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-64 shrink-0 rounded-xl" />
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-16">
          <div>
            <Skeleton className="h-6 w-56" />
            <Skeleton className="mt-2 h-4 w-72" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className={`h-40 rounded-xl sm:h-48 ${i < 2 ? "col-span-2 sm:col-span-3" : "col-span-1 sm:col-span-2"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {Array.from({ length: 3 }).map((_, section) => (
        <section key={section}>
          <div className="mx-auto w-full max-w-6xl px-4 pb-16">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-80" />
            <div className="mt-4 flex gap-3 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-56 shrink-0 rounded-xl" />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
