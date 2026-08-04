import Image from "next/image";
import Link from "next/link";
import { Flame } from "lucide-react";
import { HomeSearchForm } from "@/components/shared/HomeSearchForm";
import { HotelHighlightScroller } from "@/components/shared/HotelHighlightScroller";
import { hotelsApi } from "@/lib/api/hotels";
import type { HotelHighlight } from "@/types/models";

// city phai khop 100% chinh ta voi VIETNAM_PROVINCES de dam bao khop tim kiem
// (Nha Trang thuoc tinh Khanh Hoa, Da Lat thuoc tinh Lam Dong - label van hien
// ten thanh pho du lich quen thuoc, nhung link tim kiem phai dung ten tinh).
const TRENDING_DESTINATIONS = [
  { label: "TP. Hồ Chí Minh", city: "TP. Hồ Chí Minh", image: "/TP-HoChiMinh.jpg" },
  { label: "Hà Nội", city: "Hà Nội", image: "/TP-HaNoi.jpg" },
  { label: "Đà Nẵng", city: "Đà Nẵng", image: "/TP-DaNang.jpg" },
  { label: "Đà Lạt", city: "Lâm Đồng", image: "/TP-DaLat.jpg" },
  { label: "Nha Trang", city: "Khánh Hòa", image: "/TP-NhaTrang.jpg" },
];

export default async function Home() {
  const [seasonalDealsResult, trendingDealsResult, topRatedHotelsResult] = await Promise.allSettled([
    hotelsApi.listSeasonalDeals(15),
    hotelsApi.listTrendingDeals(15),
    hotelsApi.listTopRatedHotels(15),
  ]);
  const seasonalDeals: HotelHighlight[] = seasonalDealsResult.status === "fulfilled" ? seasonalDealsResult.value : [];
  const trendingDeals: HotelHighlight[] = trendingDealsResult.status === "fulfilled" ? trendingDealsResult.value : [];
  const topRatedHotels: HotelHighlight[] = topRatedHotelsResult.status === "fulfilled" ? topRatedHotelsResult.value : [];

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative h-[440px] w-full overflow-hidden sm:h-[500px] md:h-[560px]">
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
      </section>

      <div className="mx-auto -mt-16 w-full max-w-6xl px-4 sm:-mt-20">
        <HomeSearchForm />
      </div>

      <section className="mt-16 sm:mt-20">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-16">
          <div>
            <h2 className="text-xl font-extrabold sm:text-2xl">Điểm đến đang thịnh hành</h2>
            <p className="text-sm text-muted-foreground">Các lựa chọn phổ biến nhất cho du khách từ Việt Nam</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            {TRENDING_DESTINATIONS.map((destination, index) => (
              <Link
                key={destination.city}
                href={`/hotels?city=${encodeURIComponent(destination.city)}`}
                className={`group relative h-40 overflow-hidden rounded-xl sm:h-48 ${
                  index < 2 ? "col-span-2 sm:col-span-3" : "col-span-1 sm:col-span-2"
                }`}
              >
                <Image
                  src={destination.image}
                  alt={destination.label}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
                  <Flame className="size-3.5 fill-primary text-primary" />
                  <span className="text-sm font-semibold text-white">{destination.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-6xl px-4 pb-16">
          <HotelHighlightScroller
            title="Ưu đãi mùa & lễ hội"
            subtitle="Giá phòng đã giảm sẵn theo mùa, không cần mã khuyến mãi"
            items={seasonalDeals}
          />
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-6xl px-4 pb-16">
          <HotelHighlightScroller
            title="Ưu đãi giảm sâu"
            subtitle="Những khách sạn đang giảm giá sâu nhất, đặt ngay kẻo lỡ"
            items={trendingDeals}
          />
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-6xl px-4 pb-16">
          <HotelHighlightScroller
            title="Khách sạn được yêu thích"
            subtitle="Đánh giá cao nhất từ những khách đã từng lưu trú"
            items={topRatedHotels}
          />
        </div>
      </section>
    </div>
  );
}
