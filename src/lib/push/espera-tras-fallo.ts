/**
 * Cuándo volver a preguntarle a una fuente que acaba de fallar.
 *
 * ## El agujero que esto tapa, medido el 2026-09-26
 *
 * Cuando `clasificacionDeSesion` lanzaba, el avisador apuntaba «esperando» y
 * **no marcaba la sesión**, así que la vuelta siguiente —cinco minutos
 * después— lo intentaba otra vez. Y la siguiente. Durante las `VENTANA_HORAS =
 * 48` enteras de la ventana: **569 intentos por sesión**.
 *
 * Cada intento no es una petición: `clasificacionDeSesion` pide `/session_result`
 * y `/drivers` en paralelo, y con un 401 cada una agota sus cuatro reintentos.
 * Son **8 peticiones HTTP por intento**, o sea ~4 552 por sesión. Medido sobre
 * un fin de semana con 401 permanente, los avisos solos eran el **66 %** de
 * todo el tráfico a OpenF1 — más que el calendario y el experimento juntos.
 *
 * Y el 401 de OpenF1 es un limitador de ritmo, no una puerta cerrada: el bucle
 * se alimentaba a sí mismo.
 *
 * ## Por qué escalonado y no una espera fija
 *
 * Un aviso de resultados es urgente —el usuario quiere saber quién ganó—, así
 * que castigar el primer tropiezo con media hora de silencio sería peor que el
 * problema. Un fallo suelto se reintenta a la vuelta siguiente, como siempre.
 * Lo que se corta es la **insistencia sostenida**: a partir del segundo fallo
 * seguido la espera sube hasta un techo de media hora.
 *
 * Con esto, una caída larga pasa de 569 intentos por sesión a ~96: el mismo
 * 83 % de recorte que el calendario, sin perder reactividad cuando la fuente
 * responde.
 *
 * ## Qué NO frena
 *
 * Solo los **errores**. Que la fuente conteste «todavía no hay datos» —lista
 * vacía— es la respuesta normal en la media hora posterior a una sesión, y esa
 * sigue reintentándose a cada vuelta: es una sola petición barata y es
 * exactamente lo que hay que hacer.
 */

/** La espera, en minutos, según cuántos fallos seguidos lleve esa clave. */
export const ESPERAS_MINUTOS = [5, 10, 20, 30] as const;

/** Cuánto esperar tras el enésimo fallo seguido. El último valor es el techo. */
export function esperaTrasFallo(fallosSeguidos: number): number {
  if (fallosSeguidos <= 0) return 0;

  const indice = Math.min(fallosSeguidos, ESPERAS_MINUTOS.length) - 1;
  return ESPERAS_MINUTOS[indice];
}

interface Racha {
  fallos: number;
  siguienteIntento: number;
}

/**
 * En memoria y no en la base a propósito.
 *
 * Es un freno de ritmo, no un dato del producto: si el proceso reinicia y se
 * pierde, lo peor que pasa es un intento de más. Guardarlo costaría una
 * escritura por fallo justo cuando el sistema ya va mal.
 */
const rachas = new Map<string, Racha>();

/** ¿Toca volver a intentarlo con esta clave? */
export function tocaIntentar(clave: string, ahora: Date): boolean {
  const racha = rachas.get(clave);
  return !racha || ahora.getTime() >= racha.siguienteIntento;
}

/** Apunta un fallo y devuelve los minutos que se esperarán antes del próximo. */
export function anotarFallo(clave: string, ahora: Date): number {
  const fallos = (rachas.get(clave)?.fallos ?? 0) + 1;
  const minutos = esperaTrasFallo(fallos);

  rachas.set(clave, { fallos, siguienteIntento: ahora.getTime() + minutos * 60_000 });

  return minutos;
}

/** La fuente contestó: la racha se acabó. */
export function olvidarFallos(clave: string): void {
  rachas.delete(clave);
}

/** Para las pruebas, y para un reinicio limpio. */
export function olvidarTodo(): void {
  rachas.clear();
}
