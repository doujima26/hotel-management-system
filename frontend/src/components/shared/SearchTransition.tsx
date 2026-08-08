"use client";

import { createContext, useContext, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SearchTransitionContextValue {
  isPending: boolean;
  navigate: (href: string) => void;
}

const SearchTransitionContext = createContext<SearchTransitionContextValue | null>(null);

// Boc quanh sidebar loc + khu vuc ket qua tim kiem cua 1 trang tim kiem/loc.
// Doi bo loc hay sap xep chi doi query string tren CUNG 1 trang - dieu huong
// nay goi tu router.push() trong component con nen loading.tsx cua Next khong
// chac chan kich hoat. Dung useTransition() de biet chinh xac luc nao dang
// cho du lieu moi, roi hien hoat anh load ngay tren khu vuc danh sach qua
// SearchTransitionPending, khong phu thuoc loading.tsx.
export function SearchTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(href: string) {
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <SearchTransitionContext.Provider value={{ isPending, navigate }}>{children}</SearchTransitionContext.Provider>
  );
}

export function useSearchTransition() {
  const ctx = useContext(SearchTransitionContext);
  if (!ctx) {
    throw new Error("useSearchTransition phai dung ben trong SearchTransitionProvider");
  }
  return ctx;
}

// Boc khu vuc danh sach ket qua: mo di va khoa thao tac trong luc cho du lieu
// moi, kem vong xoay o giua - khong boc toan trang de sidebar loc van bam
// duoc binh thuong trong luc cho.
export function SearchTransitionPending({ children }: { children: ReactNode }) {
  const { isPending } = useSearchTransition();
  return (
    <div className="relative">
      <div className={cn("transition-opacity duration-150", isPending && "pointer-events-none opacity-40")}>
        {children}
      </div>
      {isPending && (
        <div className="absolute inset-x-0 top-16 flex justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
