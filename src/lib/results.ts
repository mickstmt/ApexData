/**
 * Result interpretation shared by the seeders and the app.
 *
 * Lives apart from the Prisma-backed modules so it can be exercised without a
 * database — these are the rules that were silently wrong for months.
 */

/**
 * A finishing position only counts when positionText is numeric.
 *
 * Jolpica marks retirements and disqualifications there ('R', 'D', 'W', 'E',
 * 'F', 'N') while `position` stays numeric and keeps its ordering value. The
 * original seeders tested `position`, so every DNF was stored as a real
 * finish and inflated win and podium counts.
 */
export function classifiedPosition(positionText: string): number | null {
  return /^\d+$/.test(positionText) ? parseInt(positionText, 10) : null;
}

export interface SeasonAggregate {
  year: number;
  team: string;
  constructorId: string;
  races: number;
  wins: number;
  podiums: number;
  points: number;
  position: number | null;
}

export interface ResultRow {
  position: number | null;
  points: number;
  rank: number | null;
  race: { year: number; round: number };
  team: { name: string; constructorId: string };
}

/**
 * Groups a driver's results per season.
 *
 * `rows` must be ordered oldest to newest: the team shown for a season is the
 * one from its latest race, which is how a mid-season transfer reads.
 */
export function aggregateSeasons(
  rows: ResultRow[],
  finalPositions: Map<number, number | null> = new Map()
): SeasonAggregate[] {
  const bySeason = new Map<number, SeasonAggregate>();

  for (const row of rows) {
    const year = row.race.year;

    const season = bySeason.get(year) ?? {
      year,
      team: row.team.name,
      constructorId: row.team.constructorId,
      races: 0,
      wins: 0,
      podiums: 0,
      points: 0,
      position: finalPositions.get(year) ?? null,
    };

    season.races += 1;
    season.points += row.points;
    if (row.position === 1) season.wins += 1;
    if (row.position !== null && row.position <= 3) season.podiums += 1;

    season.team = row.team.name;
    season.constructorId = row.team.constructorId;

    bySeason.set(year, season);
  }

  return [...bySeason.values()].sort((a, b) => b.year - a.year);
}

export interface DuelRow {
  driverId: string;
  position: number | null;
  race: { round: number };
}

/**
 * Counts who finished ahead across the rounds where both drivers were
 * classified. A round where either retired proves nothing about pace, so it
 * counts for neither.
 */
export function compareDuels(rows: DuelRow[], driverPk: string, teammatePk: string) {
  const byRound = new Map<number, { driver?: number | null; teammate?: number | null }>();

  for (const row of rows) {
    const slot = byRound.get(row.race.round) ?? {};
    if (row.driverId === driverPk) slot.driver = row.position;
    if (row.driverId === teammatePk) slot.teammate = row.position;
    byRound.set(row.race.round, slot);
  }

  let driver = 0;
  let teammate = 0;

  for (const round of byRound.values()) {
    if (round.driver == null || round.teammate == null) continue;
    if (round.driver < round.teammate) driver++;
    else if (round.teammate < round.driver) teammate++;
  }

  return { driver, teammate };
}
