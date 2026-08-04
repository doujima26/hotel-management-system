import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
      // Anh nguoi dung tai len do backend phuc vu. Di qua rewrite de trinh
      // duyet thay cung 1 origin voi frontend, khong dinh CORS va dung duoc
      // next/image ma khong phai khai bao remotePatterns.
      {
        source: "/uploads/:path*",
        destination: `${backendOrigin}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
