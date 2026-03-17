import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["recharts"],
};

export default nextConfig;
