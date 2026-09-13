import { raceStart, type RaceTiming } from './race-time';

/**
 * Qué enseñar en «Último resultado» cuando la carrera más nueva ya corrió pero
 * sus resultados no han llegado.
 *
 * ## El problema, tal y como lo vio el usuario
 *
 * A las cuatro horas de terminar el GP de España 2026, la portada decía
 * «próxima carrera: Azerbaiyán» —correcto, España ya había corrido— y justo
 * debajo «último resultado: **Italian Grand Prix**», que es la carrera
 * anterior. Y mientras tanto él ya tenía en el teléfono un aviso nuestro
 * diciendo quién había ganado en España.
 *
 * Comprobado en ese momento: la ronda 14 existía en la base con **0
 * resultados**, la última con resultados era la 13, y **Jolpica no publicaba
 * nada** a las cuatro horas. Con Italia había tardado entre seis y ocho.
 *
 * No es un fallo: son tres fuentes a tres velocidades —el calendario al
 * instante, el aviso a los pocos minutos por FastF1, y la base esperando a
 * Jolpica— y la portada las enseñaba juntas sin decirlo. Lo que no vale es
 * **contradecir a nuestro propio aviso** enseñando una carrera vieja como si
 * fuera la última.
 *
 * ## Por qué tres horas
 *
 * Un gran premio dura como mucho dos horas por reglamento, y tres contando una
 * suspensión larga: la de Italia 2026 fueron 1h52 de carrera más media hora
 * parados. Antes de ese margen, «ya corrió y no hay resultados» sería mentira
 * — podría estar corriéndose ahora mismo.
 */

/** El margen desde la salida tras el cual una carrera seguro que ya acabó. */
const HORAS_HASTA_SEGURO = 3;

export interface CarreraDeLaPortada extends RaceTiming {
  year: number;
  round: number;
}

/**
 * Si la carrera ya terminó con seguridad.
 *
 * `Race.date` cae a medianoche UTC porque Jolpica guarda el día y la hora por
 * separado, así que compararlo a secas adelanta la carrera un día entero. Por
 * eso se compone con `raceStart` y no se mira `date` a pelo.
 */
export function yaTermino(carrera: RaceTiming, ahora: Date): boolean {
  return raceStart(carrera).getTime() + HORAS_HASTA_SEGURO * 3_600_000 <= ahora.getTime();
}

/**
 * Si hay que enseñar «resultados en camino» en vez del resultado anterior.
 *
 * Se dice que sí cuando la carrera más reciente **ya terminó**, **no tiene
 * resultados** y es **más nueva** que la última que sí los tiene. Fuera de eso
 * la portada se comporta como siempre.
 */
export function esperandoResultados(
  ultima: (CarreraDeLaPortada & { resultados: number }) | null,
  conResultados: { year: number; round: number } | null,
  ahora: Date
): boolean {
  if (!ultima || ultima.resultados > 0) return false;
  if (!yaTermino(ultima, ahora)) return false;
  if (!conResultados) return true;

  // Más nueva: por año, y dentro del año por ronda.
  return (
    ultima.year > conResultados.year ||
    (ultima.year === conResultados.year && ultima.round > conResultados.round)
  );
}
