/**
 * Lap time parsing.
 *
 * The telemetry service formats times as "M:SS.mmm", or "SS.mmm" when the lap
 * is under a minute. Compared as strings those sort wrong — "1:29.165" is
 * quicker than "59.900" but compares after it — so a timing screen that wants
 * to mark the quickest lap of the session has to read them as numbers.
 */

import type { LapData } from '@/types';

/** "1:29.165" | "59.900" -> milliseconds. Null for anything unparseable. */
export function lapTimeToMs(value: string | null | undefined): number | null {
  if (!value) return null;

  const match = value.trim().match(/^(?:(\d+):)?([0-5]?\d(?:\.\d+)?)$/);
  if (!match) return null;

  const minutes = match[1] ? Number(match[1]) : 0;
  const seconds = Number(match[2]);

  return Math.round((minutes * 60 + seconds) * 1000);
}

/**
 * Index of the quickest lap in a list, or null if none can be read.
 *
 * This is what separates the two broadcast colours: the quickest lap on the
 * screen is the purple one, every other driver's best is green.
 */
export function fastestLapIndex(times: (string | null | undefined)[]): number | null {
  let best: number | null = null;
  let bestMs = Infinity;

  for (const [index, time] of times.entries()) {
    const ms = lapTimeToMs(time);
    if (ms !== null && ms < bestMs) {
      bestMs = ms;
      best = index;
    }
  }

  return best;
}

/**
 * La vuelta más rápida de **cada piloto**, ordenadas de la mejor a la peor.
 *
 * Hace falta porque el endpoint `/fastest` no hace eso: ordena **todas** las
 * vueltas de la sesión por tiempo y corta las N primeras. Con N=20 en la PL1 de
 * Zandvoort 2026 salían 20 vueltas de solo **diez** pilotos —Piastri tres veces,
 * Leclerc otras tres— y faltaban doce. Para una tabla que dice «la vuelta rápida
 * de cada uno», hay que quedarse con una por piloto.
 *
 * Se compara en milisegundos y no por el orden en que vienen: fiarse de que la
 * lista llegue ordenada ata esta función a un detalle del servicio que puede
 * cambiar, y «1:12.949» contra «59.900» tampoco se puede comparar como texto.
 */
export function mejorVueltaPorPiloto(vueltas: LapData[]): LapData[] {
  const mejor = new Map<string, { vuelta: LapData; ms: number }>();

  for (const vuelta of vueltas) {
    const ms = lapTimeToMs(vuelta.LapTime);
    if (ms === null) continue;

    const actual = mejor.get(vuelta.Driver);
    if (!actual || ms < actual.ms) mejor.set(vuelta.Driver, { vuelta, ms });
  }

  return [...mejor.values()].sort((a, b) => a.ms - b.ms).map(({ vuelta }) => vuelta);
}

/**
 * La diferencia de cada piloto con el que tiene justo delante: «+0.211».
 *
 * Solo se compara **dentro del mismo tramo**, y esa es la parte que importa. En
 * una clasificación el orden no lo manda el reloj: quien cae en Q1 va detrás de
 * quien llegó a Q2 aunque su vuelta fuera mejor, y el mejor tiempo que se enseña
 * de cada uno viene de tramos distintos. Restar a través de esa frontera da un
 * número que no significa nada —y puede salir **negativo**, porque un piloto
 * puede rodar en Q3 más lento que su propia vuelta de Q2—. Así que el primero de
 * cada tramo no lleva diferencia: no hay nadie con quien compararlo.
 *
 * Devuelve una entrada por fila, alineada con la lista que entra, y `null`
 * donde no hay diferencia que dar.
 */
export function intervalosAlAnterior(
  filas: { time: string | null | undefined; segment?: number | null }[]
): (string | null)[] {
  return filas.map((fila, indice) => {
    if (indice === 0) return null;

    const anterior = filas[indice - 1];
    if ((fila.segment ?? null) !== (anterior.segment ?? null)) return null;

    const ms = lapTimeToMs(fila.time);
    const msAnterior = lapTimeToMs(anterior.time);
    if (ms === null || msAnterior === null) return null;

    const diferencia = (ms - msAnterior) / 1000;
    return `${diferencia >= 0 ? '+' : '−'}${Math.abs(diferencia).toFixed(3)}`;
  });
}
