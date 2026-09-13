import type { NextConfig } from "next";

const mediaCache = [
  {
    key: "Cache-Control",
    value: "public, max-age=604800, stale-while-revalidate=86400",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/video/:path*", headers: mediaCache },
      { source: "/images/:path*", headers: mediaCache },
    ];
  },
};

export default nextConfig;
