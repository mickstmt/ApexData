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
  // La política de contenido NO va aquí: la escribe `middleware.ts`, porque
  // lleva un nonce distinto en cada petición y esto es una lista fija. Lo que
  // sí queda es `frame-ancestors` para las rutas que el middleware no toca
  // —archivos estáticos—, donde no hay documento que proteger pero tampoco
  // cuesta nada.
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  // Traces only the modules the app imports, so the Docker image ships a
  // fraction of a full node_modules and the build's memory peak stays lower.
  output: 'standalone',

  // Sin `X-Powered-By: Next.js` en cada respuesta: decirle a quien pregunta
  // qué framework y qué versión corre solo le ahorra el sondeo.
  poweredByHeader: false,
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
      {
        /**
         * Los coches, inmutables.
         *
         * El nombre lleva la temporada (`ferrari-2026.avif`), así que un
         * archivo nunca cambia de contenido: una parrilla nueva estrena
         * nombres. Se pueden cachear para siempre sin revalidar, que es lo que
         * evita once peticiones condicionales por cada visita a la rejilla.
         */
        source: '/images/cars/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Security-Policy', value: "default-src 'none'; sandbox" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        /**
         * Las imágenes, servidas sin poder ejecutar nada.
         *
         * `dangerouslyAllowSVG` va acompañado de una CSP estricta, pero esa CSP
         * **solo se aplica a `/_next/image`**: abrir directamente
         * `/images/circuits/adelaide.svg` sirve el archivo con las cabeceras
         * generales, y un SVG es un documento que puede llevar `<script>`.
         *
         * Y estos SVG no son nuestros: `scripts/images/*` los descarga de
         * repositorios de GitHub y de Wikimedia. Hoy están limpios —se
         * revisaron los 79 el 2026-08-24, cero contenido activo—, pero si
         * alguno de esos orígenes se compromete y alguien vuelve a ejecutar
         * `npm run images:all`, entraría un SVG con script servido desde
         * nuestro propio dominio. Esto lo deja inerte de antemano.
         */
        source: '/images/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "default-src 'none'; style-src 'unsafe-inline'; sandbox" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
