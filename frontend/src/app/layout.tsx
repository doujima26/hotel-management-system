import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/shared/QueryProvider";
import { AuthBootstrap } from "@/components/shared/AuthBootstrap";
import { Navbar } from "@/components/shared/Navbar";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hotel Booking",
  description: "Nền tảng đặt phòng khách sạn",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <AuthBootstrap />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Toaster position="top-center" />
        </QueryProvider>
      </body>
    </html>
  );
}
