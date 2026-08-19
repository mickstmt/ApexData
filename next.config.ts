import type { NextConfig } from 'next';

/**
 * Security headers.
 *
 * `frame-ancestors 'none'` (rather than X-Frame-Options) also covers the
 * service worker and manifest, which a framing attack could otherwise reach.
 * HSTS is only meaningful over HTTPS, which is what the hosting provides.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    // The app needs no camera, microphone or geolocation.
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  // Traces only the modules the app imports, so the Docker image ships a
  // fraction of a full node_modules and the build's memory peak stays lower.
  output: 'standalone',
  /**
   * Las dos pantallas retiradas.
   *
   * `/telemetry` era el demo de OpenF1 que llevaba desde diciembre diciendo
   * "próximamente"; lo que enseñaba de verdad —las condiciones de la sesión—
   * vive ahora en `/analysis`, con la sesión que el usuario elige y no con "la
   * última que hubiera". `/compare` calculaba sobre las últimas cinco carreras,
   * lo que daba comparaciones engañosas; el cara a cara de la ficha de piloto
   * lo sustituye con la temporada entera.
   *
   * Redirección permanente y no borrado a secas: puede haber enlaces guardados,
   * y un 404 no explica nada.
   */
  async redirects() {
    return [
      { source: '/telemetry', destination: '/analysis', permanent: true },
      { source: '/compare', destination: '/drivers', permanent: true },
    ];
  },

  images: {
    // Flags, circuit layouts and most team logos are SVG. next/image refuses to
    // optimise SVG unless this is set, which would break every one of them.
    // Safe here because all of them are self-hosted under public/images and the
    // policy below stops any embedded script from running.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // No remotePatterns on purpose. Every image is self-hosted under
    // public/images, and allowing arbitrary hosts would turn the optimizer
    // into an open proxy: anyone could serve their own content from this
    // domain, and the server would fetch hosts chosen by third parties.
  },
  experimental: {
    // Optimizaciones para production
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // The worker must always be revalidated, otherwise a cached copy keeps
        // serving an old app after a deploy.
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
