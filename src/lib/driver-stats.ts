import { prisma } from '@/lib/prisma';

/**
 * Career and per-season figures for a driver, plus the head-to-head against
 * whoever shared the garage that season.
 *
 * Everything is derived from stored results rather than a running tally, so
 * the numbers stay correct when a season is re-seeded.
 */

export interface SeasonRow {
  year: number;
  team: string;
  constructorId: string;
  races: number;
  wins: number;
  podiums: number;
  points: number;
  position: number | null;
}

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

  const bySeason = new Map<number, SeasonRow>();

  for (const result of results) {
    const year = result.race.year;
    const row = bySeason.get(year) ?? {
      year,
      team: result.team.name,
      constructorId: result.team.constructorId,
      races: 0,
      wins: 0,
      podiums: 0,
      points: 0,
      position: finalPosition.get(year) ?? null,
    };

    row.races += 1;
    row.points += result.points;
    if (result.position === 1) row.wins += 1;
    if (result.position !== null && result.position <= 3) row.podiums += 1;
    // Mid-season moves are common; the latest team is the one shown.
    row.team = result.team.name;
    row.constructorId = result.team.constructorId;

    bySeason.set(year, row);
  }

  const finished = results.filter((r) => r.position !== null).map((r) => r.position!);

  return {
    races: results.length,
    wins: results.filter((r) => r.position === 1).length,
    podiums: results.filter((r) => r.position !== null && r.position <= 3).length,
    poles,
    points: Math.round(results.reduce((sum, r) => sum + r.points, 0) * 100) / 100,
    bestFinish: finished.length > 0 ? Math.min(...finished) : null,
    fastestLaps: results.filter((r) => r.rank === 1).length,
    seasons: [...bySeason.values()].sort((a, b) => b.year - a.year),
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

  const compare = (
    rows: Array<{ driverId: string; position: number | null; race: { round: number } }>
  ) => {
    const byRound = new Map<number, { driver?: number | null; teammate?: number | null }>();

    for (const row of rows) {
      const slot = byRound.get(row.race.round) ?? {};
      if (row.driverId === driverPk) slot.driver = row.position;
      if (row.driverId === teammatePk) slot.teammate = row.position;
      byRound.set(row.race.round, slot);
    }

    let driverAhead = 0;
    let teammateAhead = 0;

    for (const { driver, teammate: mate } of byRound.values()) {
      // Only rounds where both were classified can be compared.
      if (driver == null || mate == null) continue;
      if (driver < mate) driverAhead++;
      else if (mate < driver) teammateAhead++;
    }

    return { driver: driverAhead, teammate: teammateAhead };
  };

  return {
    teammate: `${teammate.givenName} ${teammate.familyName}`,
    teammateId: teammate.driverId,
    year,
    race: compare(teamResults),
    qualifying: compare(teamQualifying),
  };
}
