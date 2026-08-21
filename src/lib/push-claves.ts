/**
 * La clave pública de VAPID, que es la mitad que puede estar a la vista.
 *
 * El par de claves identifica al servidor ante el servicio de push del
 * navegador. La pública viaja al cliente por definición —va en la propia
 * suscripción—, así que escribirla aquí no filtra nada y ahorra una variable de
 * entorno que, si faltara, dejaría la función muerta en silencio. La privada
 * vive en `VAPID_PRIVATE_KEY` y no sale del servidor.
 *
 * Se puede sobreescribir con `NEXT_PUBLIC_VAPID_PUBLIC_KEY` por si algún día
 * hay que rotar el par sin tocar el código.
 */
export const VAPID_PUBLICA =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BKlYfccRY1ErWrSiPPjmejtkhoiePF9Jo1omNfePdhmREL3tGtEfafScYfUTdvTBKpJ2dAw9gaJ1CzdSxNfw1Es';

/**
 * El navegador quiere la clave en bytes, no en la cadena que se guarda.
 *
 * El tipo de vuelta es `ArrayBuffer` y no `Uint8Array` porque `subscribe()`
 * exige un búfer respaldado por `ArrayBuffer`, y el tipo genérico de
 * `Uint8Array` admite además memoria compartida, que ahí no vale.
 */
export function claveABytes(base64: string): ArrayBuffer {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(normal);

  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);

  return bytes.buffer;
}
