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

export async function getTelemetryOptions(): Promise<{
  sessions: SessionOption[];
  drivers: DriverOption[];
}> {
  const now = new Date();

  const races = await prisma.race.findMany({
    where: { year: { gte: FASTF1_FIRST_SEASON }, date: { lte: now }, results: { some: {} } },
    orderBy: [{ year: 'desc' }, { round: 'desc' }],
    take: 60,
    select: { year: true, round: true, raceName: true },
  });

  const sessions = races.map((race) => ({
    year: race.year,
    round: race.round,
    name: `${race.year} · ${race.raceName}`,
  }));

  // Drivers who took part in the most recent race with data, which is the
  // grid a user will want to compare by default.
  const latest = races[0];

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
