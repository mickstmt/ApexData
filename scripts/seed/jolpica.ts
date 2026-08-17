/**
 * Shared Jolpica F1 client and entity upserts used by the season seeder.
 *
 * Jolpica rejects requests without a descriptive User-Agent (403) and rate
 * limits bursts (429), so every call goes through `fetchJolpica`.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

const BASE_URL = 'https://api.jolpi.ca/ergast/f1';
const USER_AGENT = 'ApexData/1.0 (personal F1 data app; https://github.com/mickstmt/ApexData)';
const REQUEST_DELAY_MS = 350;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface JolpicaDriver {
  driverId: string;
  givenName: string;
  familyName: string;
  code?: string;
  permanentNumber?: string;
  nationality: string;
  dateOfBirth: string;
  url: string;
}

export interface JolpicaConstructor {
  constructorId: string;
  name: string;
  nationality: string;
  url: string;
}

export interface JolpicaCircuit {
  circuitId: string;
  circuitName: string;
  url: string;
  Location: { lat: string; long: string; locality: string; country: string };
}

interface JolpicaSession {
  date: string;
  time?: string;
}

export interface JolpicaRace {
  season: string;
  round: string;
  raceName: string;
  url: string;
  Circuit: JolpicaCircuit;
  date: string;
  time?: string;
  FirstPractice?: JolpicaSession;
  SecondPractice?: JolpicaSession;
  ThirdPractice?: JolpicaSession;
  Qualifying?: JolpicaSession;
  Sprint?: JolpicaSession;
  Results?: JolpicaRaceResult[];
  QualifyingResults?: JolpicaQualifyingResult[];
  SprintResults?: JolpicaRaceResult[];
}

export interface JolpicaRaceResult {
  position: string;
  positionText: string;
  points: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  grid: string;
  laps: string;
  status: string;
  Time?: { time: string; millis?: string };
  FastestLap?: {
    lap: string;
    rank?: string;
    Time: { time: string };
    AverageSpeed?: { speed: string };
  };
}

export interface JolpicaQualifyingResult {
  position: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

/**
 * A finishing position only counts when positionText is numeric. Retirements
 * and disqualifications carry 'R', 'D', 'W', 'E', 'F' or 'N' there, while
 * `position` stays numeric and would silently look like a real result.
 */
export function classifiedPosition(positionText: string): number | null {
  return /^\d+$/.test(positionText) ? parseInt(positionText, 10) : null;
}

export async function fetchJolpica<T>(path: string): Promise<T | null> {
  const url = `${BASE_URL}${path}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

    if (response.status === 404) return null;

    if (response.status === 429) {
      const wait = attempt * 5000;
      console.log(`     ⏳ Rate limit, esperando ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Jolpica ${response.status} ${response.statusText} en ${path}`);
    }

    await sleep(REQUEST_DELAY_MS);
    return (await response.json()) as T;
  }

  throw new Error(`Jolpica sigue limitando las peticiones tras 3 intentos en ${path}`);
}

export async function upsertDriver(driver: JolpicaDriver) {
  return prisma.driver.upsert({
    where: { driverId: driver.driverId },
    update: {
      code: driver.code || null,
      permanentNumber: driver.permanentNumber ? parseInt(driver.permanentNumber, 10) : null,
      url: driver.url,
    },
    create: {
      driverId: driver.driverId,
      givenName: driver.givenName,
      familyName: driver.familyName,
      code: driver.code || null,
      permanentNumber: driver.permanentNumber ? parseInt(driver.permanentNumber, 10) : null,
      nationality: driver.nationality,
      // Pre-war entrants occasionally have no recorded birth date.
      dateOfBirth: driver.dateOfBirth ? new Date(driver.dateOfBirth) : null,
      url: driver.url,
    },
  });
}

export async function upsertConstructor(constructor: JolpicaConstructor) {
  const model = prisma.team;

  return model.upsert({
    where: { constructorId: constructor.constructorId },
    update: { name: constructor.name, url: constructor.url },
    create: {
      constructorId: constructor.constructorId,
      name: constructor.name,
      nationality: constructor.nationality,
      url: constructor.url,
    },
  });
}

export async function upsertCircuit(circuit: JolpicaCircuit) {
  // Some historical venues ship without coordinates.
  const coordinate = (value?: string) => {
    const parsed = parseFloat(value ?? '');
    return Number.isFinite(parsed) ? parsed : null;
  };

  const data = {
    name: circuit.circuitName,
    location: circuit.Location.locality,
    country: circuit.Location.country,
    lat: coordinate(circuit.Location.lat),
    lng: coordinate(circuit.Location.long),
    url: circuit.url,
  };

  return prisma.circuit.upsert({
    where: { circuitId: circuit.circuitId },
    update: data,
    create: { circuitId: circuit.circuitId, ...data },
  });
}

/** Combines a session's date and optional time into a Date, or null. */
function sessionDate(session?: JolpicaSession): Date | null {
  if (!session?.date) return null;
  return new Date(`${session.date}T${session.time ?? '00:00:00Z'}`);
}

export async function upsertRace(race: JolpicaRace) {
  const year = parseInt(race.season, 10);
  const round = parseInt(race.round, 10);

  await upsertCircuit(race.Circuit);
  await prisma.season.upsert({
    where: { year },
    update: {},
    create: { year, url: `https://en.wikipedia.org/wiki/${year}_Formula_One_World_Championship` },
  });

  // Practice, qualifying and sprint schedules only ship with the calendar
  // endpoint, so they are written whenever present and left alone otherwise.
  const schedule = {
    fp1Date: sessionDate(race.FirstPractice),
    fp2Date: sessionDate(race.SecondPractice),
    fp3Date: sessionDate(race.ThirdPractice),
    qualiDate: sessionDate(race.Qualifying),
    sprintDate: sessionDate(race.Sprint),
  };
  const definedSchedule = Object.fromEntries(
    Object.entries(schedule).filter(([, value]) => value !== null)
  );

  return prisma.race.upsert({
    where: { year_round: { year, round } },
    update: {
      raceName: race.raceName,
      date: new Date(race.date),
      time: race.time || null,
      url: race.url,
      circuitId: race.Circuit.circuitId,
      ...definedSchedule,
    },
    create: {
      year,
      round,
      raceName: race.raceName,
      date: new Date(race.date),
      time: race.time || null,
      url: race.url,
      circuitId: race.Circuit.circuitId,
      ...definedSchedule,
    },
  });
}
