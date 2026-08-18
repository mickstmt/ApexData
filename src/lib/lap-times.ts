/**
 * Lap time parsing.
 *
 * The telemetry service formats times as "M:SS.mmm", or "SS.mmm" when the lap
 * is under a minute. Compared as strings those sort wrong — "1:29.165" is
 * quicker than "59.900" but compares after it — so a timing screen that wants
 * to mark the quickest lap of the session has to read them as numbers.
 */

/** "1:29.165" | "59.900" -> milliseconds. Null for anything unparseable. */
export function lapTimeToMs(value: string | null | undefined): number | null {
  if (!value) return null;

  const match = value.trim().match(/^(?:(\d+):)?([0-5]?\d(?:\.\d+)?)$/);
  if (!match) return null;

  const minutes = match[1] ? Number(match[1]) : 0;
  const seconds = Number(match[2]);

  return Math.round((minutes * 60 + seconds) * 1000);
}

/**
 * Index of the quickest lap in a list, or null if none can be read.
 *
 * This is what separates the two broadcast colours: the quickest lap on the
 * screen is the purple one, every other driver's best is green.
 */
export function fastestLapIndex(times: (string | null | undefined)[]): number | null {
  let best: number | null = null;
  let bestMs = Infinity;

  for (const [index, time] of times.entries()) {
    const ms = lapTimeToMs(time);
    if (ms !== null && ms < bestMs) {
      bestMs = ms;
      best = index;
    }
  }

  return best;
}
