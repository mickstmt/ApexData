import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Selector data for the telemetry page.
 *
 * FastF1 only has timing data from 2018 onwards, so the race list is capped
 * there rather than offering seasons that would always come back empty. Both
 * lists come from the database, replacing the hardcoded demo sessions and the
 * 2024 grid that used to be baked into the page.
 */

export const FASTF1_FIRST_SEASON = 2018;

export interface SessionOption {
  year: number;
  round: number;
  name: string;
}

export interface DriverOption {
  code: string;
  name: string;
  constructorId: string | null;
}

async function loadTelemetryOptions(): Promise<{
  sessions: SessionOption[];
  drivers: DriverOption[];
}> {
  const now = new Date();

  // El fin de semana en curso también cuenta.
  //
  // Antes la lista pedía `results: { some: {} }`, es decir, solo carreras ya
  // corridas **y sembradas**. Eso dejaba fuera justo el fin de semana que se
  // está viendo: el viernes hay práctica y clasificación al sprint rodadas, con
  // sus tiempos en FastF1, y el Gran Premio no aparecía en el selector porque su
  // carrera es el domingo. Quien llegaba aquí desde una práctica de la portada
  // se encontraba con otro Gran Premio elegido.
  //
  // FastF1 tiene los datos en cuanto la sesión rueda, así que el corte correcto
  // no es «ya hay resultados» sino «ya ha empezado algo»: la carrera, o la
  // primera sesión del fin de semana.
  const races = await prisma.race.findMany({
    where: {
      year: { gte: FASTF1_FIRST_SEASON },
      OR: [
        { date: { lte: now } },
        { fp1Date: { lte: now } },
        { sprintQualiDate: { lte: now } },
      ],
    },
    orderBy: [{ year: 'desc' }, { round: 'desc' }],
    take: 60,
    select: { year: true, round: true, raceName: true },
  });

  const sessions = races.map((race) => ({
    year: race.year,
    round: race.round,
    name: `${race.year} · ${race.raceName}`,
  }));

  // Los pilotos salen de la última carrera **con resultados**, que no tiene por
  // qué ser la primera de la lista desde que el fin de semana en curso entra en
  // ella: si se cogiera `races[0]` un viernes, el selector de pilotos saldría
  // vacío.
  const latest = await prisma.race.findFirst({
    where: { year: { gte: FASTF1_FIRST_SEASON }, results: { some: {} } },
    orderBy: [{ year: 'desc' }, { round: 'desc' }],
    select: { year: true, round: true },
  });

  const entries = latest
    ? await prisma.result.findMany({
        where: { race: { year: latest.year, round: latest.round } },
        orderBy: { positionOrder: 'asc' },
        select: {
          driver: { select: { code: true, givenName: true, familyName: true } },
          team: { select: { constructorId: true } },
        },
      })
    : [];

  const drivers = entries
    .filter((entry) => entry.driver.code)
    .map((entry) => ({
      code: entry.driver.code!,
      name: `${entry.driver.givenName} ${entry.driver.familyName}`,
      constructorId: entry.team.constructorId,
    }));

  return { sessions, drivers };
}

/**
 * Una consulta por hora en lugar de una por visita. Se cachean los datos y no
 * la página: la página tiene que seguir siendo dinámica porque el build se
 * ejecuta sin base de datos.
 *
 * Si la base no responde, se devuelven listas vacías en vez de tumbar la
 * página entera: la telemetría es una sección, no la app.
 */
export const getTelemetryOptions = unstable_cache(
  async () => {
    try {
      return await loadTelemetryOptions();
    } catch (error) {
      console.error('Error loading telemetry options:', error);
      return { sessions: [], drivers: [] };
    }
  },
  ['telemetry-options'],
  { revalidate: 3600 }
);
