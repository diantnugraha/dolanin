import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The CMS must never render inside another site's frame (clickjacking).
  async headers() {
    return [
      {
        source: "/admin/:path*", // also matches /admin itself
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
