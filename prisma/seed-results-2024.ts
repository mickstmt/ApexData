/**
 * Seed Script: Race Results 2024
 *
 * Este script obtiene todos los resultados de carreras de la temporada 2024
 * desde la API de Jolpica F1 y los inserta en nuestra base de datos.
 *
 * Uso: npx tsx prisma/seed-results-2024.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Base URL de Jolpica F1 API
const JOLPICA_BASE_URL = 'https://api.jolpi.ca/ergast/f1';

interface JolpicaDriver {
  driverId: string;
  givenName: string;
  familyName: string;
  code?: string;
  permanentNumber?: string;
  nationality: string;
  dateOfBirth: string;
  url: string;
}

interface JolpicaConstructor {
  constructorId: string;
  name: string;
  nationality: string;
  url: string;
}

interface JolpicaResult {
  position: string;
  positionText: string;
  points: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  grid: string;
  laps: string;
  status: string;
  Time?: {
    time: string;
    millis?: string;
  };
  FastestLap?: {
    lap: string;
    rank: string;
    Time: {
      time: string;
    };
    AverageSpeed: {
      speed: string;
    };
  };
}

interface JolpicaRace {
  season: string;
  round: string;
  raceName: string;
  Circuit: {
    circuitId: string;
  };
  date: string;
  Results: JolpicaResult[];
}

async function fetchRacesWithResults(year: number) {
  console.log(`\n🔍 Obteniendo resultados de la temporada ${year}...`);

  const url = `${JOLPICA_BASE_URL}/${year}/results.json?limit=1000`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.MRData.RaceTable.Races as JolpicaRace[];
}

async function ensureDriverExists(jolpicaDriver: JolpicaDriver) {
  const existingDriver = await prisma.driver.findUnique({
    where: { driverId: jolpicaDriver.driverId },
  });

  if (existingDriver) {
    return existingDriver;
  }

  console.log(`  ➕ Creando piloto: ${jolpicaDriver.givenName} ${jolpicaDriver.familyName}`);

  return await prisma.driver.create({
    data: {
      driverId: jolpicaDriver.driverId,
      givenName: jolpicaDriver.givenName,
      familyName: jolpicaDriver.familyName,
      code: jolpicaDriver.code || null,
      permanentNumber: jolpicaDriver.permanentNumber ? parseInt(jolpicaDriver.permanentNumber) : null,
      nationality: jolpicaDriver.nationality,
      dateOfBirth: new Date(jolpicaDriver.dateOfBirth),
      url: jolpicaDriver.url,
    },
  });
}

async function ensureConstructorExists(jolpicaConstructor: JolpicaConstructor) {
  const existingConstructor = await prisma.constructor.findUnique({
    where: { constructorId: jolpicaConstructor.constructorId },
  });

  if (existingConstructor) {
    return existingConstructor;
  }

  console.log(`  ➕ Creando constructor: ${jolpicaConstructor.name}`);

  return await prisma.constructor.create({
    data: {
      constructorId: jolpicaConstructor.constructorId,
      name: jolpicaConstructor.name,
      nationality: jolpicaConstructor.nationality,
      url: jolpicaConstructor.url,
    },
  });
}

async function ensureRaceExists(jolpicaRace: JolpicaRace) {
  const year = parseInt(jolpicaRace.season);
  const round = parseInt(jolpicaRace.round);

  const existingRace = await prisma.race.findUnique({
    where: {
      year_round: { year, round },
    },
  });

  if (existingRace) {
    return existingRace;
  }

  console.log(`  ➕ Creando carrera: ${jolpicaRace.raceName} (Round ${round})`);

  // Ensure circuit exists (basic creation)
  const circuitId = jolpicaRace.Circuit.circuitId;
  const existingCircuit = await prisma.circuit.findUnique({
    where: { circuitId },
  });

  if (!existingCircuit) {
    console.log(`  ➕ Creando circuito básico: ${circuitId}`);
    // Create a minimal circuit entry
    await prisma.circuit.create({
      data: {
        circuitId,
        name: circuitId.charAt(0).toUpperCase() + circuitId.slice(1),
        location: 'Unknown',
        country: 'Unknown',
      },
    });
  }

  return await prisma.race.create({
    data: {
      year,
      round,
      raceName: jolpicaRace.raceName,
      date: new Date(jolpicaRace.date),
      circuitId,
    },
  });
}

async function seedResults2024() {
  console.log('🚀 Iniciando seed de resultados 2024...\n');

  try {
    // 1. Obtener todas las carreras con resultados de 2024
    const races = await fetchRacesWithResults(2024);
    console.log(`✅ Se encontraron ${races.length} carreras con resultados\n`);

    let totalResults = 0;
    let newResults = 0;

    // 2. Procesar cada carrera
    for (const race of races) {
      console.log(`\n📍 Procesando: ${race.raceName} (Round ${race.round})`);

      // Asegurar que existan season, race, drivers y constructors
      const dbRace = await ensureRaceExists(race);

      // 3. Procesar cada resultado
      for (const result of race.Results) {
        totalResults++;

        // Asegurar que existan el piloto y constructor
        const driver = await ensureDriverExists(result.Driver);
        const constructor = await ensureConstructorExists(result.Constructor);

        // Verificar si el resultado ya existe
        const existingResult = await prisma.result.findFirst({
          where: {
            raceId: dbRace.id,
            driverId: driver.id,
          },
        });

        if (existingResult) {
          console.log(`  ⏭️  Resultado ya existe: ${driver.familyName} - P${result.positionText}`);
          continue;
        }

        // Crear el resultado
        const position = result.position === 'R' || result.position === 'D'
          ? null
          : parseInt(result.position);

        await prisma.result.create({
          data: {
            raceId: dbRace.id,
            driverId: driver.id,
            constructorId: constructor.id,
            position,
            positionText: result.positionText,
            positionOrder: parseInt(result.position) || 99, // DNF al final
            points: parseFloat(result.points),
            grid: parseInt(result.grid),
            laps: parseInt(result.laps),
            status: result.status,
            statusId: result.status === 'Finished' ? 1 : 2, // Simplificado
            time: result.Time?.time || null,
            milliseconds: result.Time?.millis ? BigInt(result.Time.millis) : null,
            fastestLap: result.FastestLap ? parseInt(result.FastestLap.lap) : null,
            rank: result.FastestLap ? parseInt(result.FastestLap.rank) : null,
            fastestLapTime: result.FastestLap?.Time.time || null,
            fastestLapSpeed: result.FastestLap?.AverageSpeed?.speed || null,
          },
        });

        newResults++;
        console.log(`  ✅ Insertado: ${driver.familyName} - P${result.positionText} (${result.points} pts)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✨ Seed completado exitosamente!`);
    console.log(`📊 Total de resultados procesados: ${totalResults}`);
    console.log(`➕ Nuevos resultados insertados: ${newResults}`);
    console.log(`⏭️  Resultados ya existentes: ${totalResults - newResults}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el seed
seedResults2024()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
