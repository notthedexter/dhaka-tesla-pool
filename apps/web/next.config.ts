import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output for Docker / self-hosted environments; omit on Vercel for native Vercel optimization
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
    if (backendUrl && !backendUrl.includes('localhost:4000')) {
      return [
        {
          source: '/api/:path*',
          destination: `${backendUrl.replace(/\/$/, '')}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
