import Image from "next/image";
import Link from "next/link";
import { HomeSearchForm } from "@/components/shared/HomeSearchForm";

// Phai khop 100% chinh ta voi VIETNAM_PROVINCES (Nha Trang thuoc Khanh Hoa,
// Da Lat thuoc Lam Dong - dung ten tinh de dam bao khop tim kiem theo city).
const POPULAR_CITIES = ["Hà Nội", "Đà Nẵng", "TP. Hồ Chí Minh", "Khánh Hòa", "Lâm Đồng"];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="px-3 pt-4 sm:px-6 sm:pt-6">
        <div className="relative mx-auto h-[440px] max-w-6xl overflow-hidden rounded-[2rem] shadow-xl sm:h-[500px] md:h-[560px]">
          <Image src="/hero.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/65" />
          <div className="relative flex h-full flex-col items-center justify-center px-4 pb-24 text-center sm:pb-28">
            <p className="text-xs font-semibold tracking-[0.3em] text-white/85 uppercase">Khám phá điểm đến</p>
            <h1 className="mt-4 max-w-2xl text-3xl leading-tight font-extrabold text-balance text-white uppercase sm:text-4xl md:text-5xl">
              Tìm khách sạn
              <br />
              <span className="text-primary">phù hợp với bạn</span>
            </h1>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-16 w-full max-w-4xl px-4 sm:-mt-20">
        <HomeSearchForm />
      </div>

      <section className="mt-16 sm:mt-20">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-16">
          <h2 className="text-xl font-extrabold sm:text-2xl">Điểm đến phổ biến</h2>
          <div className="flex flex-wrap items-center gap-3">
            {POPULAR_CITIES.map((city) => (
              <Link
                key={city}
                href={`/hotels?city=${encodeURIComponent(city)}`}
                className="rounded-full border bg-background px-3.5 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary"
              >
                {city}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
