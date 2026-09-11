/**
 * Cuánto lleva recorrido cada coche, y lo que sale de ahí: el orden, el hueco
 * al líder, la vuelta, y quién se quedó fuera.
 *
 * ## Por qué se proyecta sobre el trazado
 *
 * Una posición `(x, y)` no dice quién va delante. Proyectarla sobre la línea
 * de referencia del circuito —el punto más cercano de la vuelta rápida— da los
 * metros de vuelta, y con las vueltas contadas, los metros desde la salida. Eso
 * sí ordena. Es lo que hace el proyecto original con un KD-tree; aquí basta
 * una rejilla, porque son 22 coches.
 *
 * ## Por qué la vuelta se cuenta con los metros y no con los cruces de meta
 *
 * FastF1 da el instante en que cada coche cruza la meta, y parecía lo natural.
 * Pero ese reloj y el cero del trazado no coinciden por unas muestras, y en el
 * desfase el progreso saltaba una vuelta entera: todos los de detrás medían
 * el mismo hueco al líder. Se vio en el mockup. Con un solo reloj —los metros
 * caen de golpe, luego se cruzó la meta— no hay desfase posible.
 */

import type { TrackPoint } from '@/types';
import { SIN_DATO, type BloqueDePosiciones } from './bloque';

export interface Trazado {
  xs: Float64Array;
  ys: Float64Array;
  /** Metros de vuelta de cada punto. */
  ds: Float64Array;
  /** Metros de la vuelta entera. */
  longitud: number;
  /** Rejilla: celda → índices de los puntos que caen en ella. */
  celdas: Map<number, number[]>;
  celda: number;
  minX: number;
  minY: number;
  columnas: number;
  filas: number;
}

/** Tamaño de celda en decímetros: ~40 m, unas cinco muestras del trazado. */
const CELDA = 400;

export function prepararTrazado(puntos: TrackPoint[]): Trazado {
  const n = puntos.length;
  const xs = new Float64Array(n), ys = new Float64Array(n), ds = new Float64Array(n);
  let minX = Infinity, minY = Infinity, maxX = -Infinity;

  puntos.forEach((p, i) => {
    xs[i] = p.x; ys[i] = p.y; ds[i] = p.distance ?? 0;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
  });

  const columnas = Math.max(1, Math.ceil((maxX - minX) / CELDA) + 1);
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) if (ys[i] > maxY) maxY = ys[i];
  const filas = Math.max(1, Math.ceil((maxY - minY) / CELDA) + 1);
  const celdas = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const clave = claveDeCelda(xs[i], ys[i], minX, minY, columnas);
    const lista = celdas.get(clave);
    if (lista) lista.push(i);
    else celdas.set(clave, [i]);
  }

  return { xs, ys, ds, longitud: n ? ds[n - 1] : 0, celdas, celda: CELDA, minX, minY, columnas, filas };
}

function claveDeCelda(x: number, y: number, minX: number, minY: number, columnas: number): number {
  return Math.floor((y - minY) / CELDA) * columnas + Math.floor((x - minX) / CELDA);
}

/** El índice del punto del trazado más cercano a `(x, y)`. */
export function puntoMasCercano(trazado: Trazado, x: number, y: number): number {
  const { xs, ys, minX, minY, columnas, filas, celdas } = trazado;
  const cx = Math.floor((x - minX) / CELDA);
  const cy = Math.floor((y - minY) / CELDA);

  let mejor = -1, distancia = Infinity;

  // Fuera de la rejilla —un coche en el garaje de un circuito grande— se mira
  // entero: es raro y barato. Y dentro, las celdas se acotan a la rejilla,
  // porque una columna fuera de rango se confunde con otra fila.
  const dentro = cx >= 0 && cx < columnas && cy >= 0 && cy < filas;

  // La celda y las ocho de alrededor; si ninguna tiene puntos, se amplía.
  for (let radio = 1; dentro && radio <= 4 && mejor === -1; radio++) {
    for (let dy = -radio; dy <= radio; dy++) {
      const fila = cy + dy;
      if (fila < 0 || fila >= filas) continue;
      for (let dx = -radio; dx <= radio; dx++) {
        const columna = cx + dx;
        if (columna < 0 || columna >= columnas) continue;
        const lista = celdas.get(fila * columnas + columna);
        if (!lista) continue;
        for (const i of lista) {
          const ex = xs[i] - x, ey = ys[i] - y, d = ex * ex + ey * ey;
          if (d < distancia) { distancia = d; mejor = i; }
        }
      }
    }
  }

  if (mejor !== -1) return mejor;

  // Muy lejos de todo (un coche en el garaje de un circuito grande): se mira entero.
  for (let i = 0; i < xs.length; i++) {
    const ex = xs[i] - x, ey = ys[i] - y, d = ex * ex + ey * ey;
    if (d < distancia) { distancia = d; mejor = i; }
  }
  return mejor;
}

/**
 * Metros recorridos desde la salida por cada coche en cada instante.
 *
 * `NaN` donde no hay posición. Monótono: un coche no retrocede, y así el
 * ruido de la proyección no cambia el orden.
 */
export function calcularProgreso(bloque: BloqueDePosiciones, trazado: Trazado): Float64Array[] {
  const { datos, count, pilotos } = bloque;
  const L = trazado.longitud;

  return Array.from({ length: pilotos }, (_, piloto) => {
    const base = piloto * 2 * count;
    const salida = new Float64Array(count);
    let previo = NaN, acumulado = 0, primero = NaN;

    for (let k = 0; k < count; k++) {
      const x = datos[base + k];
      // `previo` NO se borra en un hueco: si el coche cruzó la meta mientras
      // no había posición, al volver sus metros son pequeños y sin la
      // comparación con el último valor conocido no se detectaría la vuelta.
      // El progreso se quedaría plano una vuelta entera y `estaFuera` lo daría
      // por retirado sin estarlo.
      if (x === SIN_DATO) { salida[k] = NaN; continue; }
      const d = trazado.ds[puntoMasCercano(trazado, x, datos[base + count + k])];

      if (!Number.isNaN(previo)) {
        if (d - previo < -L / 2) acumulado += L;
        else if (d - previo > L / 2) acumulado -= L;
      }

      salida[k] = acumulado + d;
      previo = d;
      if (Number.isNaN(primero)) primero = salida[k];
    }

    // En la parrilla los coches están DETRÁS de la meta, o sea al final del
    // trazado: sin esto, la salida ya contaría como una vuelta hecha.
    const desplazar = primero > L / 2 ? L : 0;
    let max = -Infinity;
    for (let k = 0; k < count; k++) {
      if (Number.isNaN(salida[k])) continue;
      salida[k] -= desplazar;
      if (salida[k] < max) salida[k] = max;
      else max = salida[k];
    }

    return salida;
  });
}

/** Los pilotos con posición en `k`, del primero al último. */
export function ordenEn(progreso: Float64Array[], k: number): number[] {
  const orden: number[] = [];
  for (let i = 0; i < progreso.length; i++) if (!Number.isNaN(progreso[i][k])) orden.push(i);
  orden.sort((a, b) => progreso[b][k] - progreso[a][k]);
  return orden;
}

/**
 * Segundos que el líder lleva de ventaja a un coche: cuánto antes pasó el
 * líder por donde este coche está ahora. Es un hueco de verdad, no una regla
 * de tres con una velocidad supuesta.
 *
 * Se busca por bisección y no barriendo hacia atrás: la historia del líder es
 * monótona, así que el último instante en que estuvo por detrás se encuentra
 * en unos veinte pasos en vez de miles. Barrer costaba lo que durase el hueco,
 * por piloto y por cuarto de segundo, y con la carrera parada recorría la
 * parada entera.
 *
 * Lo que la bisección NO cambia es el número: con todos quietos, el instante
 * en que el líder pasó por ahí se queda atrás mientras el reloj sigue, así que
 * el hueco crece aunque nadie se mueva. No es un fallo de la cuenta sino de la
 * pregunta: con la carrera detenida no hay distancia en pista que medir. Por
 * eso la pantalla no lo enseña con bandera roja.
 */
export function huecoEn(progreso: Float64Array[], k: number, lider: number, piloto: number, paso: number): number {
  const p = progreso[piloto][k];
  if (piloto === lider || Number.isNaN(p)) return 0;

  const historia = progreso[lider];

  // El líder ya estaba por delante en la salida: todo el tiempo transcurrido.
  if (Number.isNaN(historia[0]) || historia[0] >= p) return k * paso;

  let bajo = 0, alto = k;
  while (bajo < alto) {
    const medio = (bajo + alto + 1) >> 1;
    if (historia[medio] < p) bajo = medio;
    else alto = medio - 1;
  }

  // `bajo` es el último instante con el líder por detrás; en el siguiente ya
  // había pasado por aquí.
  return (k - bajo - 1) * paso;
}

/** En qué vuelta va un coche, desde 1. */
export function vueltaEn(progreso: Float64Array[], piloto: number, k: number, longitud: number): number {
  const p = progreso[piloto][k];
  if (Number.isNaN(p) || longitud <= 0) return 1;
  return Math.max(1, Math.floor(p / longitud) + 1);
}

/** Cuántos instantes quieto cuentan como haberse quedado fuera: un minuto. */
export const INSTANTES_QUIETO = 240;

/**
 * Si un coche se quedó fuera: lleva un minuto sin avanzar mientras el líder
 * sí avanza. Con bandera roja se paran todos, líder incluido, y nadie está
 * fuera; una parada en boxes son veinte o treinta segundos, no sesenta.
 */
export function estaFuera(progreso: Float64Array[], piloto: number, k: number, lider: number): boolean {
  const p = progreso[piloto][k];
  if (Number.isNaN(p)) return true;
  if (k < INSTANTES_QUIETO || piloto === lider) return false;

  const antes = k - INSTANTES_QUIETO;
  const quieto = p === progreso[piloto][antes];
  const liderAvanza = progreso[lider][k] - progreso[lider][antes] > 0;
  return quieto && liderAvanza;
}
