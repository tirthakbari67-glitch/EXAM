import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/python_backend/index.py',
      },
    ];
  },
};

export default nextConfig;
