import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The dev-mode "N" badge sat over the resident tab bar and map legends during demos (24 Nov 2026).
  devIndicators: false,
};

export default nextConfig;
