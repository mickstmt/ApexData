/**
 * Qué direcciones de push aceptamos guardar.
 *
 * `/api/push` es la única ruta pública que ESCRIBE en la base, y no tiene
 * cuentas ni sesión detrás: lo único que comprobaba era que los tres campos
 * existieran. Eso abría tres cosas a la vez, y las tres las encontró la
 * auditoría del 2026-08-24:
 *
 * 1. **Petición forzada desde el servidor.** `avisarATodos()` recorre la tabla
 *    y hace un POST a cada dirección guardada. Con una dirección inventada
 *    —`http://ditto_apexdata-telemetry:8000/…` o `http://169.254.169.254/…`—
 *    el aviso del domingo se convierte en una petición nuestra contra la red
 *    interna del VPS. Y como una respuesta 404 o 410 borra la fila, el que la
 *    registró puede distinguir un puerto vivo de uno muerto.
 * 2. **Crecimiento sin tope.** `endpoint` es único, así que cada cadena
 *    distinta crea una fila. Sin validación, un bucle llena la base.
 * 3. **Filas enormes.** Los tres campos son `text` sin longitud máxima.
 *
 * La defensa es una lista de destinos: solo los servidores de push de los
 * navegadores de verdad. Son cuatro, son estables y son los únicos a los que
 * tiene sentido escribir.
 */

/**
 * Los servicios de push de cada navegador.
 *
 * Se compara el HOST completo o un sufijo con punto delante: `endsWith` a secas
 * dejaría pasar `fcm.googleapis.com.atacante.net`, que es el fallo clásico de
 * este tipo de listas.
 */
const SERVIDORES = [
  'fcm.googleapis.com', // Chrome, Edge, Android
  'push.services.mozilla.com', // Firefox
  'notify.windows.com', // Edge antiguo, Windows
  'push.apple.com', // Safari, iOS
];

export function destinoDePushValido(direccion: string): boolean {
  // Un tope generoso pero real: las direcciones de verdad rondan los 200
  // caracteres. Se comprueba antes de construir la URL para no gastar trabajo
  // en una cadena de megabytes.
  if (typeof direccion !== 'string' || direccion.length > 512) return false;

  let url: URL;
  try {
    url = new URL(direccion);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();

  return SERVIDORES.some((servidor) => host === servidor || host.endsWith(`.${servidor}`));
}

/** Las claves del navegador: base64url, y con un tamaño que se conoce. */
export function claveDePushValida(clave: string, maximo: number): boolean {
  return (
    typeof clave === 'string' &&
    clave.length > 0 &&
    clave.length <= maximo &&
    /^[A-Za-z0-9_-]+=*$/.test(clave)
  );
}

/** `p256dh` es una clave pública P-256 sin comprimir: 65 bytes → 88 en base64. */
export const MAXIMO_P256DH = 128;

/** `auth` es un secreto de 16 bytes → 24 en base64. */
export const MAXIMO_AUTH = 32;
