/**
 * Race start times.
 *
 * Jolpica splits a session into a date-only field and a separate time, so
 * `Race.date` lands at midnight UTC. Comparing or displaying that value alone
 * puts every race a full day early — the hero card would advertise the next
 * grand prix from 00:00 UTC on race day, and a countdown would expire hours
 * before the lights go out.
 */

export interface RaceTiming {
  date: Date;
  time: string | null;
}

/** Combines the stored date and time into the real session start. */
export function raceStart(race: RaceTiming): Date {
  const day = race.date.toISOString().slice(0, 10);
  const time = race.time ?? '00:00:00Z';

  const combined = new Date(`${day}T${time.endsWith('Z') ? time : `${time}Z`}`);

  return Number.isNaN(combined.getTime()) ? race.date : combined;
}

/** A race counts as upcoming until its scheduled start passes. */
export function isUpcoming(race: RaceTiming, now: Date = new Date()): boolean {
  return raceStart(race).getTime() >= now.getTime();
}
