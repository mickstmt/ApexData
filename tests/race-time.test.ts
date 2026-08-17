import { describe, expect, it } from 'vitest';
import { isUpcoming, raceStart } from '@/lib/race-time';

/**
 * Jolpica splits a session into a date-only field and a separate time, so
 * `Race.date` lands at midnight UTC. Reading it alone announced every grand
 * prix a day early and expired the countdown hours before the start.
 */
describe('raceStart', () => {
  it('combines the stored date with the session time', () => {
    const start = raceStart({ date: new Date('2026-08-23T00:00:00Z'), time: '13:00:00Z' });

    expect(start.toISOString()).toBe('2026-08-23T13:00:00.000Z');
  });

  it('accepts a time without the trailing Z', () => {
    const start = raceStart({ date: new Date('2026-08-23T00:00:00Z'), time: '13:00:00' });

    expect(start.toISOString()).toBe('2026-08-23T13:00:00.000Z');
  });

  it('falls back to the stored date when no time is recorded', () => {
    // Historical races often have no start time.
    const start = raceStart({ date: new Date('1994-05-01T00:00:00Z'), time: null });

    expect(start.toISOString()).toBe('1994-05-01T00:00:00.000Z');
  });

  it('falls back rather than returning an invalid date', () => {
    const start = raceStart({ date: new Date('2026-08-23T00:00:00Z'), time: 'not a time' });

    expect(Number.isNaN(start.getTime())).toBe(false);
    expect(start.toISOString()).toBe('2026-08-23T00:00:00.000Z');
  });
});

describe('isUpcoming', () => {
  const race = { date: new Date('2026-08-23T00:00:00Z'), time: '13:00:00Z' };

  it('is still upcoming during the morning of race day', () => {
    // The whole point: at 09:00 UTC the race has not started, even though the
    // stored date (midnight) is already in the past.
    expect(isUpcoming(race, new Date('2026-08-23T09:00:00Z'))).toBe(true);
  });

  it('is no longer upcoming once the start time passes', () => {
    expect(isUpcoming(race, new Date('2026-08-23T13:30:00Z'))).toBe(false);
  });

  it('is upcoming on previous days', () => {
    expect(isUpcoming(race, new Date('2026-08-21T18:00:00Z'))).toBe(true);
  });
});
