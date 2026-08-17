import { describe, expect, it } from 'vitest';
import {
  aggregateSeasons,
  classifiedPosition,
  compareDuels,
  type ResultRow,
} from '@/lib/results';

/**
 * These cover the rules that were silently wrong in production for months.
 * Each case is a real shape returned by Jolpica, not an invented one.
 */

describe('classifiedPosition', () => {
  it('reads a numeric finish', () => {
    expect(classifiedPosition('1')).toBe(1);
    expect(classifiedPosition('18')).toBe(18);
  });

  it.each([
    ['R', 'retired'],
    ['D', 'disqualified'],
    ['W', 'withdrew'],
    ['E', 'excluded'],
    ['F', 'failed to qualify'],
    ['N', 'not classified'],
  ])('treats %s (%s) as unclassified', (marker) => {
    expect(classifiedPosition(marker)).toBeNull();
  });

  it('does not accept a marker that merely starts with a digit', () => {
    // Guards the regex against a partial match such as "1R".
    expect(classifiedPosition('1R')).toBeNull();
  });

  it('is what separates a retirement from a finish in the same payload', () => {
    // Jolpica keeps `position` numeric even for a retirement — the bug the old
    // seeders had was reading that field instead of positionText.
    const retirement = { position: '18', positionText: 'R' };
    expect(classifiedPosition(retirement.positionText)).toBeNull();
  });
});

describe('aggregateSeasons', () => {
  const row = (
    year: number,
    round: number,
    position: number | null,
    points: number,
    team = 'Mercedes',
    constructorId = 'mercedes'
  ): ResultRow => ({
    position,
    points,
    rank: null,
    race: { year, round },
    team: { name: team, constructorId },
  });

  it('counts races, wins, podiums and points per season', () => {
    const [season] = aggregateSeasons([
      row(2026, 1, 1, 25),
      row(2026, 2, 3, 15),
      row(2026, 3, 7, 6),
    ]);

    expect(season).toMatchObject({ year: 2026, races: 3, wins: 1, podiums: 2, points: 46 });
  });

  it('does not count a retirement as a podium', () => {
    const [season] = aggregateSeasons([row(2026, 1, null, 0), row(2026, 2, 2, 18)]);

    expect(season.races).toBe(2);
    expect(season.podiums).toBe(1);
    expect(season.wins).toBe(0);
  });

  it('shows the team from the latest round after a mid-season move', () => {
    const [season] = aggregateSeasons([
      row(2026, 1, 5, 10, 'Alpine', 'alpine'),
      row(2026, 2, 4, 12, 'Alpine', 'alpine'),
      row(2026, 3, 6, 8, 'Williams', 'williams'),
    ]);

    expect(season.team).toBe('Williams');
    expect(season.constructorId).toBe('williams');
  });

  it('returns seasons newest first', () => {
    const seasons = aggregateSeasons([row(2024, 1, 1, 25), row(2026, 1, 1, 25), row(2025, 1, 1, 25)]);

    expect(seasons.map((season) => season.year)).toEqual([2026, 2025, 2024]);
  });

  it('carries the final championship position when known', () => {
    const [season] = aggregateSeasons([row(2026, 1, 1, 25)], new Map([[2026, 3]]));

    expect(season.position).toBe(3);
  });
});

describe('compareDuels', () => {
  const duel = (round: number, driverId: string, position: number | null) => ({
    driverId,
    position,
    race: { round },
  });

  it('counts who finished ahead', () => {
    const result = compareDuels(
      [
        duel(1, 'a', 2),
        duel(1, 'b', 5),
        duel(2, 'a', 6),
        duel(2, 'b', 3),
        duel(3, 'a', 1),
        duel(3, 'b', 4),
      ],
      'a',
      'b'
    );

    expect(result).toEqual({ driver: 2, teammate: 1 });
  });

  it('skips rounds where either driver did not finish', () => {
    // A retirement says nothing about relative pace, so it counts for neither.
    const result = compareDuels(
      [duel(1, 'a', 3), duel(1, 'b', null), duel(2, 'a', null), duel(2, 'b', 2)],
      'a',
      'b'
    );

    expect(result).toEqual({ driver: 0, teammate: 0 });
  });

  it('skips a round only one of them entered', () => {
    const result = compareDuels([duel(1, 'a', 4), duel(2, 'a', 5), duel(2, 'b', 8)], 'a', 'b');

    expect(result).toEqual({ driver: 1, teammate: 0 });
  });

  it('ignores drivers outside the pair', () => {
    const result = compareDuels(
      [duel(1, 'a', 4), duel(1, 'b', 6), duel(1, 'c', 1)],
      'a',
      'b'
    );

    expect(result).toEqual({ driver: 1, teammate: 0 });
  });
});
