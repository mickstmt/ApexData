import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Flags, circuit layouts and most team logos are SVG. next/image refuses to
    // optimise SVG unless this is set, which would break every one of them.
    // Safe here because all of them are self-hosted under public/images and the
    // policy below stops any embedded script from running.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
