import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow image domains if loading remote images
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
