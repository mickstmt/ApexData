/**
 * Race start times.
 *
 * Jolpica splits a session into a date-only field and a separate time, so
 * `Race.date` lands at midnight UTC. Comparing or displaying that value alone
 * puts every race a full day early — the hero card would advertise the next
 * grand prix from 00:00 UTC on race day, and a countdown would expire hours
 * before the lights go out.
 */

export interface RaceTiming {
  date: Date;
  time: string | null;
}

/** Combines the stored date and time into the real session start. */
export function raceStart(race: RaceTiming): Date {
  const day = race.date.toISOString().slice(0, 10);
  const time = race.time ?? '00:00:00Z';

  const combined = new Date(`${day}T${time.endsWith('Z') ? time : `${time}Z`}`);

  return Number.isNaN(combined.getTime()) ? race.date : combined;
}

/** A race counts as upcoming until its scheduled start passes. */
export function isUpcoming(race: RaceTiming, now: Date = new Date()): boolean {
  return raceStart(race).getTime() >= now.getTime();
}

/** Los campos de `Race` que son fechas y que la portada usa como tales. */
const CAMPOS_DE_FECHA = [
  'date',
  'fp1Date',
  'fp2Date',
  'fp3Date',
  'qualiDate',
  'sprintDate',
  'sprintQualiDate',
] as const;

/**
 * Devuelve las fechas a ser fechas al salir de la caché.
 *
 * `unstable_cache` guarda serializando a JSON, así que un `Date` vuelve como
 * cadena y `raceStart` revienta con «date.toISOString is not a function».
 *
 * **Vive aquí, y no junto a la portada, porque ya falló dos veces.** La primera
 * se arregló rehidratando solo la lista de próximas carreras; la fila de «la
 * última que ya corrió» se quedó sin rehidratar y volvió a reventar el
 * 2026-09-26, el día del GP de Azerbaiyán, en cuanto hubo una carrera corrida
 * sin resultados —que es el único caso en que esa fila se mira—. Cualquier fila
 * que salga de una caché y vaya a pasar por `raceStart` tiene que pasar antes
 * por aquí.
 */
export function conFechasDeVerdad<T extends Record<string, unknown>>(fila: T): T {
  const copia = { ...fila } as Record<string, unknown>;
  for (const campo of CAMPOS_DE_FECHA) {
    const valor = copia[campo];
    if (typeof valor === 'string') copia[campo] = new Date(valor);
  }
  return copia as T;
}
