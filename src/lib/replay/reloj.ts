/**
 * El reloj del replay: del tiempo real al instante de la carrera.
 *
 * El instante es un número con decimales, no un índice: a 4 Hz, cada
 * fotograma del navegador cae entre dos muestras, y esa fracción es lo que
 * permite interpolar. Truncarla a entero es exactamente el tirón que se midió
 * en el proyecto original.
 */

export const VELOCIDADES = [1, 2, 4, 8] as const;
export type Velocidad = (typeof VELOCIDADES)[number];

/** La siguiente de la lista, dando la vuelta: 8× → 1×. */
export function siguienteVelocidad(actual: Velocidad): Velocidad {
  const i = VELOCIDADES.indexOf(actual);
  return VELOCIDADES[(i + 1) % VELOCIDADES.length];
}

/**
 * El instante que toca, `ms` milisegundos después de arrancar en `k0`.
 *
 * Se calcula desde el arranque y no sumando fotograma a fotograma: la suma
 * acumula el error de cada `requestAnimationFrame` y al cabo de unos minutos
 * el reloj de pantalla y el de la carrera se separan.
 */
export function instanteTras(k0: number, ms: number, velocidad: Velocidad, paso: number, count: number): number {
  const k = k0 + ((ms / 1000) * velocidad) / paso;
  return Math.max(0, Math.min(count - 1, k));
}

/**
 * `m:ss`, y `h:mm:ss` en cuanto la carrera pasa de la hora.
 *
 * Antes eran minutos sin límite, así que el final de una carrera de hora y
 * cuarto marcaba `78:42`. Es un reloj de carrera correcto y nadie lo había
 * reportado como fallo, pero fuera de contexto ese número no se lee: hay que
 * dividir mentalmente por sesenta para saber que va por la hora y cuarto.
 *
 * La hora aparece **solo cuando la hay**. `0:48:20` a los cuarenta y ocho
 * minutos se lee peor que `48:20`, y la carrera pasa por los dos formatos una
 * sola vez. Quien pinta esto reserva el ancho para que no salte al cruzarla.
 *
 * Los negativos se cortan a cero.
 */
export function formatoReloj(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const ss = String(s % 60).padStart(2, '0');
  const m = Math.floor(s / 60);

  if (s < 3600) return `${m}:${ss}`;
  return `${Math.floor(s / 3600)}:${String(m % 60).padStart(2, '0')}:${ss}`;
}

/** Cuántos caracteres ocupa el reloj más largo de una carrera de `duracion`. */
export function anchoDelReloj(duracion: number): number {
  return formatoReloj(Math.max(0, Math.floor(duracion))).length;
}

/** Diez segundos, en instantes. */
export function saltoDe(segundos: number, paso: number): number {
  return Math.round(segundos / paso);
}

/**
 * Cuántos segundos mueve **de verdad** un salto, ya recortado contra los topes.
 *
 * `buscar` acota a `[0, count-1]`, así que a los cuatro segundos de carrera el
 * botón de «10 s atrás» mueve cuatro. Un indicador que dijera «−10 s» ahí
 * estaría mintiendo, y es justo el detalle que hace que una función nueva se
 * sienta rota: se pulsa, el número dice diez y la barra apenas se mueve.
 *
 * **Devuelve el valor exacto, sin redondear**, y ese matiz importa: con
 * `Math.round` a medio segundo del inicio salía `-0`, que en JavaScript es
 * igual a `0`, así que el botón de atrás se apagaba **antes de llegar al
 * principio** y esos últimos instantes quedaban fuera de su alcance. Una zona
 * muerta de medio paso, y solo hacia atrás: hacia delante `Math.round` redondea
 * al alza y no se daba. Quien quiera enseñarlo redondea al escribirlo; quien
 * decida si el botón sirve, mira el cero de verdad.
 */
export function saltoReal(k: number, salto: number, count: number, paso: number): number {
  const destino = Math.max(0, Math.min(count - 1, k + salto));
  return (destino - k) * paso;
}

/**
 * El salto, escrito para leerlo: «+10 s», «−4 s».
 *
 * Redondea **alejándose del cero**, no al alza, para que medio segundo hacia
 * atrás no se convierta en «−0 s». Por debajo de un segundo se dice con un
 * decimal: en los últimos instantes, decir «−1 s» de un movimiento de medio
 * sería volver a la mentira que este indicador vino a quitar.
 */
export function textoDelSalto(segundos: number): string {
  const signo = segundos < 0 ? '−' : '+';
  const magnitud = Math.abs(segundos);
  const cifra = magnitud < 1 ? magnitud.toFixed(1).replace('.', ',') : String(Math.round(magnitud));
  return `${signo}${cifra} s`;
}
