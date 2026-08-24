/**
 * La política de contenido: qué puede cargar y ejecutar la página.
 *
 * Hasta ahora solo decía `frame-ancestors 'none'`, que impide que nos metan en
 * un marco y nada más. La auditoría del 2026-08-24 no encontró ningún XSS —lo
 * buscó— así que esto no tapa un agujero abierto: es la red que decide qué pasa
 * **si algún día lo hay**. Sin ella, un script inyectado se ejecuta sin
 * obstáculo y puede mandar lo que quiera a donde quiera.
 *
 * ## Por qué con nonce y no con una lista de dominios
 *
 * `script-src 'self'` no sirve de nada frente a un XSS: el script inyectado
 * vive en la propia página, así que ya es «self». Lo único que distingue a un
 * script nuestro de uno metido por un atacante es que el nuestro lleva un
 * número que solo el servidor conoce y que cambia en cada petición.
 *
 * `'strict-dynamic'` acompaña al nonce porque Next carga sus trozos de código
 * creando etiquetas `<script>` desde uno que sí lo lleva: sin esto habría que
 * enumerar cada archivo con su hash, y cambian en cada build.
 *
 * ## Lo que se queda fuera a propósito
 *
 * `style-src` admite `'unsafe-inline'`. No es dejadez: React escribe los
 * `style={{…}}` como atributos, Tailwind inyecta su hoja y framer-motion cambia
 * transformaciones en cada fotograma. Poner nonces a los estilos exigiría
 * reescribir la mitad de la interfaz para protegerse de un ataque —inyección de
 * CSS— que sin `script-src` abierto es de alcance muy corto.
 */

/** Las directivas que no dependen del nonce ni del entorno. */
const COMUNES = [
  "default-src 'self'",
  // Ver arriba: los estilos en línea son parte de cómo funciona React.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // La app solo habla con su propio servidor. Esto es lo que impide que un
  // script inyectado se lleve nada a otro sitio, que es el daño de verdad.
  "connect-src 'self'",
  "media-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  // No hay plugins ni marcos: negarlos cuesta cero.
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  // Sin esto, un `<base href>` inyectado desvía TODAS las rutas relativas de la
  // página —incluidas las de los scripts— a un servidor ajeno.
  "base-uri 'self'",
  "form-action 'self'",
];

export function politicaDeContenido(nonce: string, desarrollo: boolean): string {
  const scripts = desarrollo
    ? // En desarrollo, Next recarga en caliente evaluando código, y con la
      // política estricta la app no arranca. La de verdad es la de producción,
      // que es la que se sirve.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const directivas = [scripts, ...COMUNES];

  // `upgrade-insecure-requests` solo tiene sentido donde hay HTTPS.
  if (!desarrollo) directivas.push('upgrade-insecure-requests');

  return directivas.join('; ');
}

/**
 * Un número de un solo uso, distinto en cada petición.
 *
 * `crypto.randomUUID()` y no `Math.random()`: el nonce solo vale mientras sea
 * imposible de adivinar. Uno predecible convierte la política en decoración.
 */
export function nuevoNonce(): string {
  return btoa(crypto.randomUUID());
}

/** Las rutas que no llevan política: no son documentos, son datos o archivos. */
export function llevaPolitica(ruta: string): boolean {
  if (ruta.startsWith('/api/')) return false;
  if (ruta.startsWith('/_next/')) return false;
  if (ruta.startsWith('/images/')) return false;
  if (ruta.startsWith('/icons/')) return false;
  if (ruta.startsWith('/splash/')) return false;

  return true;
}
