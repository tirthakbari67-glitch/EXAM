import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // In development, proxy /api requests to the local FastAPI backend
    // In production on Vercel, the api/ folder is auto-detected as serverless functions
    if (process.env.NODE_ENV === 'development') {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/:path*`,
        },
      ];
    return [
      {
        source: '/api/:path*',
        destination: '/api/index.py',
      },
    ];
  },
};


export default nextConfig;
