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

/** `m:ss`, como el reloj de una carrera. Los negativos se cortan a cero. */
export function formatoReloj(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Diez segundos, en instantes. */
export function saltoDe(segundos: number, paso: number): number {
  return Math.round(segundos / paso);
}
