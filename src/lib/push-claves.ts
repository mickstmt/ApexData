/**
 * La clave pública de VAPID, que es la mitad que puede estar a la vista.
 *
 * El par de claves identifica al servidor ante el servicio de push del
 * navegador. La pública viaja al cliente por definición —va en la propia
 * suscripción—, así que escribirla aquí no filtra nada y ahorra una variable de
 * entorno que, si faltara, dejaría la función muerta en silencio. La privada
 * vive en `VAPID_PRIVATE_KEY` y no sale del servidor.
 *
 * ## Rotar el par pasa por aquí, no por una variable
 *
 * Había escrito que `NEXT_PUBLIC_VAPID_PUBLIC_KEY` permitía rotar «sin tocar el
 * código». **No es verdad**, y conviene que quede dicho antes de que alguien lo
 * intente en una urgencia: las variables `NEXT_PUBLIC_*` las incrusta Next en
 * el paquete durante el `build`, EasyPanel las pasa como argumentos de
 * construcción y el `Dockerfile` no declara ningún `ARG` que las recoja. Puesta
 * en el panel, esa variable no llega nunca al navegador y la clave que se usa
 * es la de abajo.
 *
 * La variable se conserva porque en desarrollo sí sirve, con un `.env` local.
 * Para rotar de verdad: se cambia esta constante, se despliega, y se pone la
 * privada nueva en EasyPanel y en el secreto de GitHub.
 *
 * Rotado el 2026-09-08: la privada del par anterior solo existía en los
 * secretos de GitHub, que no dejan volver a leerlos, y el reloj de avisos pasó
 * a vivir dentro de la aplicación —donde también hace falta—. Las suscripciones
 * firmadas con la pública vieja dejan de valer y se borran solas al primer
 * envío fallido, que es lo que ya hace el remitente con las direcciones muertas.
 */
export const VAPID_PUBLICA =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BAysYI_uK_n527YLYFsU0sv2oGVIPLINVVyqLgWUnYzaRN2G4N1sIMqD9q2WNgJlIOIbihK63A6o12c2D4PePkY';

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
