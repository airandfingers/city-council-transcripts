import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // YouTube's static thumbnail CDN — used by YouTubePlayer to show a
        // real poster frame instead of a black box while the IFrame API
        // loads (FEAT-VIDEO-POSTER-001).
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
    ],
  },
};

export default nextConfig;
