import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    // Optimizaciones para production
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
