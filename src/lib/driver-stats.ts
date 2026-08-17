import { prisma } from '@/lib/prisma';
import { aggregateSeasons, compareDuels, type SeasonAggregate } from '@/lib/results';

/**
 * Career and per-season figures for a driver, plus the head-to-head against
 * whoever shared the garage that season.
 *
 * Everything is derived from stored results rather than a running tally, so
 * the numbers stay correct when a season is re-seeded.
 */

export type SeasonRow = SeasonAggregate;

export interface HeadToHead {
  teammate: string;
  teammateId: string;
  year: number;
  race: { driver: number; teammate: number };
  qualifying: { driver: number; teammate: number };
}

export interface DriverStats {
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  bestFinish: number | null;
  fastestLaps: number;
  seasons: SeasonRow[];
  headToHead: HeadToHead | null;
}

export async function getDriverStats(driverPk: string): Promise<DriverStats> {
  const [results, poles, standings] = await Promise.all([
    prisma.result.findMany({
      where: { driverId: driverPk },
      // Ordered so the loop below can treat the last row of a season as its
      // most recent race when resolving mid-season team changes.
      orderBy: [{ race: { year: 'asc' } }, { race: { round: 'asc' } }],
      select: {
        position: true,
        points: true,
        rank: true,
        race: { select: { year: true, round: true } },
        team: { select: { name: true, constructorId: true } },
      },
    }),
    prisma.qualifying.count({ where: { driverId: driverPk, position: 1 } }),
    prisma.driverStanding.findMany({
      where: { driverId: driverPk },
      orderBy: [{ year: 'asc' }, { round: 'desc' }],
      select: { year: true, round: true, position: true },
    }),
  ]);

  // Final standing per season is the entry from its last recorded round.
  const finalPosition = new Map<number, number | null>();
  for (const standing of standings) {
    if (!finalPosition.has(standing.year)) finalPosition.set(standing.year, standing.position);
  }

  const seasons = aggregateSeasons(results, finalPosition);

  const finished = results.filter((r) => r.position !== null).map((r) => r.position!);

  return {
    races: results.length,
    wins: results.filter((r) => r.position === 1).length,
    podiums: results.filter((r) => r.position !== null && r.position <= 3).length,
    poles,
    points: Math.round(results.reduce((sum, r) => sum + r.points, 0) * 100) / 100,
    bestFinish: finished.length > 0 ? Math.min(...finished) : null,
    fastestLaps: results.filter((r) => r.rank === 1).length,
    seasons,
    headToHead: null,
  };
}

/**
 * Compares a driver with their team-mate over a season: who finished ahead
 * when both were classified, and who out-qualified whom.
 */
export async function getHeadToHead(
  driverPk: string,
  year: number
): Promise<HeadToHead | null> {
  const entries = await prisma.result.findMany({
    where: { driverId: driverPk, race: { year } },
    select: { constructorId: true, race: { select: { round: true } } },
  });

  if (entries.length === 0) return null;

  // The team the driver raced for most that season.
  const byTeam = new Map<string, number>();
  for (const entry of entries) {
    byTeam.set(entry.constructorId, (byTeam.get(entry.constructorId) ?? 0) + 1);
  }
  const teamPk = [...byTeam.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const [teamResults, teamQualifying] = await Promise.all([
    prisma.result.findMany({
      where: { constructorId: teamPk, race: { year } },
      select: {
        driverId: true,
        position: true,
        race: { select: { round: true } },
        driver: { select: { driverId: true, givenName: true, familyName: true } },
      },
    }),
    prisma.qualifying.findMany({
      where: { constructorId: teamPk, race: { year } },
      select: { driverId: true, position: true, race: { select: { round: true } } },
    }),
  ]);

  // The team-mate is whoever else drove for that team most often.
  const partnerCounts = new Map<string, number>();
  for (const entry of teamResults) {
    if (entry.driverId === driverPk) continue;
    partnerCounts.set(entry.driverId, (partnerCounts.get(entry.driverId) ?? 0) + 1);
  }

  const teammatePk = [...partnerCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!teammatePk) return null;

  const teammate = teamResults.find((entry) => entry.driverId === teammatePk)!.driver;

  return {
    teammate: `${teammate.givenName} ${teammate.familyName}`,
    teammateId: teammate.driverId,
    year,
    race: compareDuels(teamResults, driverPk, teammatePk),
    qualifying: compareDuels(teamQualifying, driverPk, teammatePk),
  };
}
