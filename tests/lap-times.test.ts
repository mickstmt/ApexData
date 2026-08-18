import { describe, expect, it } from 'vitest';
import { fastestLapIndex, lapTimeToMs } from '@/lib/lap-times';

describe('lapTimeToMs', () => {
  it('reads the "M:SS.mmm" the telemetry service sends', () => {
    expect(lapTimeToMs('1:29.165')).toBe(89165);
    expect(lapTimeToMs('1:29.179')).toBe(89179);
  });

  it('reads a sub-minute lap, which arrives without the minute part', () => {
    expect(lapTimeToMs('59.900')).toBe(59900);
  });

  it('returns null for missing or unreadable values', () => {
    expect(lapTimeToMs(null)).toBeNull();
    expect(lapTimeToMs(undefined)).toBeNull();
    expect(lapTimeToMs('')).toBeNull();
    expect(lapTimeToMs('-')).toBeNull();
    expect(lapTimeToMs('P0DT0H1M29.165S')).toBeNull();
  });
});

describe('fastestLapIndex', () => {
  it('picks the quickest lap, not the one that sorts first as text', () => {
    // The bug this guards: as strings, "59.900" sorts after "1:29.165".
    expect(fastestLapIndex(['1:29.165', '59.900', '1:28.900'])).toBe(1);
  });

  it('ignores laps with no time', () => {
    expect(fastestLapIndex([null, '1:31.000', undefined, '1:30.500'])).toBe(3);
  });

  it('returns null when nothing can be read', () => {
    expect(fastestLapIndex([])).toBeNull();
    expect(fastestLapIndex([null, '-'])).toBeNull();
  });

  it('keeps the first of two identical times', () => {
    expect(fastestLapIndex(['1:30.000', '1:30.000'])).toBe(0);
  });
});
