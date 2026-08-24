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
  /** La clasificación del sprint, el viernes de un fin de semana al sprint. */
  SprintQualifying?: JolpicaSession;
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

// Shared with the app so both read a result the same way.
export { classifiedPosition } from '../../src/lib/results';

/**
 * La fuente no responde, y no es culpa nuestra.
 *
 * Se distingue de cualquier otro fallo a propósito: un tropiezo de Jolpica es
 * un motivo para volver a intentarlo dentro de una hora, no para pintar el
 * repositorio de rojo. El 2026-08-23, el tic de las 16:24 UTC —el primero tras
 * la bandera a cuadros— murió aquí y le llegó al usuario un aviso de fallo un
 * domingo por la mañana; el de las 17:19 sembró la carrera sin novedad.
 */
export class FuenteNoDisponibleError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'FuenteNoDisponibleError';
  }
}

const INTENTOS = 4;

export async function fetchJolpica<T>(path: string): Promise<T | null> {
  const url = `${BASE_URL}${path}`;
  let ultimo = '';

  for (let intento = 1; intento <= INTENTOS; intento++) {
    let response: Response;

    try {
      response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    } catch (error) {
      // La red se cayó a mitad. Antes esto ni se intentaba de nuevo: la promesa
      // de `fetch` se rechazaba y el sembrado entero moría.
      ultimo = `sin respuesta (${(error as Error).message})`;
      await esperar(intento);
      continue;
    }

    if (response.status === 404) return null;

    // 429 es «vas muy rápido»; 5xx es «estoy mal ahora mismo». Las dos se
    // arreglan esperando, y ninguna es un error de este programa. Antes solo se
    // reintentaba la primera, y un 502 pasajero tumbaba la ejecución al primer
    // intento — que es justo lo que pasa cuando media afición pide los
    // resultados a la vez, diez minutos después de una carrera.
    if (response.status === 429 || response.status >= 500) {
      ultimo = `${response.status} ${response.statusText}`;
      console.log(`     ⏳ Jolpica responde ${ultimo}; intento ${intento} de ${INTENTOS}.`);
      await esperar(intento);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Jolpica ${response.status} ${response.statusText} en ${path}`);
    }

    await sleep(REQUEST_DELAY_MS);
    return (await response.json()) as T;
  }

  throw new FuenteNoDisponibleError(
    `Jolpica no respondió tras ${INTENTOS} intentos en ${path} (lo último: ${ultimo}).`
  );
}

/** Espera creciente entre intentos: 5, 10, 20 segundos. */
function esperar(intento: number) {
  return sleep(5000 * 2 ** (intento - 1));
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
    sprintQualiDate: sessionDate(race.SprintQualifying),
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
