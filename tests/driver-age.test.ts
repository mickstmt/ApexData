import { describe, expect, it } from 'vitest';
import { driverAge, formatBirthDate } from '@/lib/driver-age';

const VERSTAPPEN = new Date('1997-09-30');

describe('driverAge', () => {
  it('does not age someone whose birthday has not arrived yet', () => {
    // The bug this guards: year minus year made him 28 all through August.
    expect(driverAge(VERSTAPPEN, new Date('2026-08-18T12:00:00Z'))).toBe(28);
  });

  it('adds the year on the birthday itself', () => {
    expect(driverAge(VERSTAPPEN, new Date('2026-09-29T23:59:00Z'))).toBe(28);
    expect(driverAge(VERSTAPPEN, new Date('2026-09-30T00:00:00Z'))).toBe(29);
  });

  it('counts the same regardless of the reader time zone', () => {
    // Midnight UTC on the birthday is still the previous evening in Lima.
    const atMidnightUtc = new Date('2026-09-30T00:00:00Z');

    expect(driverAge(VERSTAPPEN, atMidnightUtc)).toBe(29);
    expect(driverAge('1997-09-30T00:00:00.000Z', atMidnightUtc)).toBe(29);
  });

  it('handles a 29 February birthday without counting a year early', () => {
    const leapling = new Date('2000-02-29');

    expect(driverAge(leapling, new Date('2025-02-28T12:00:00Z'))).toBe(24);
    expect(driverAge(leapling, new Date('2025-03-01T12:00:00Z'))).toBe(25);
  });

  it('returns null for missing or unreadable dates', () => {
    expect(driverAge(null)).toBeNull();
    expect(driverAge(undefined)).toBeNull();
    expect(driverAge('not a date')).toBeNull();
  });
});

describe('formatBirthDate', () => {
  it('shows the stored day, not the one the local clock would shift it to', () => {
    // Rendered in local time this reads 29/9/1997 anywhere west of Greenwich.
    expect(formatBirthDate(VERSTAPPEN)).toContain('30');
    expect(formatBirthDate(VERSTAPPEN)).toContain('1997');
  });

  it('returns null when there is no date', () => {
    expect(formatBirthDate(null)).toBeNull();
  });
});
