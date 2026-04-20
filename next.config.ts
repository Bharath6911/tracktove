import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: [
    "hookworm-excited-crayfish.ngrok-free.app",
  ],
};

export default nextConfig;
