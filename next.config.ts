import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["gqdzlktdsqirupzobwgo.supabase.co"],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
