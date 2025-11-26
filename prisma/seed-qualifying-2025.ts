import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Jolpica F1 API base URL
const JOLPICA_BASE_URL = 'https://api.jolpi.ca/ergast/f1';

// ============================================================================
// TypeScript Interfaces for Jolpica API responses
// ============================================================================

interface JolpicaDriver {
  driverId: string;
  permanentNumber: string;
  code: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
  url: string;
}

interface JolpicaConstructor {
  constructorId: string;
  name: string;
  nationality: string;
  url: string;
}

interface JolpicaQualifyingResult {
  number: string;
  position: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

interface JolpicaRace {
  season: string;
  round: string;
  raceName: string;
  url: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    url: string;
    Location: {
      lat: string;
      long: string;
      locality: string;
      country: string;
    };
  };
  date: string;
  time?: string;
  QualifyingResults: JolpicaQualifyingResult[];
}

async function fetchQualifyingResults(year: number) {
  console.log(`\n🔍 Obteniendo resultados de qualifying de la temporada ${year}...`);

  const allRaces: JolpicaRace[] = [];

  // Fetch each round individually (up to round 24)
  for (let round = 1; round <= 24; round++) {
    const url = `${JOLPICA_BASE_URL}/${year}/${round}/qualifying.json`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        // If a round doesn't exist (404), continue with next
        if (response.status === 404) {
          console.log(`  ⏭️  Ronda ${round}: Sin qualifying disponible aún`);
          continue;
        }
        throw new Error(`Error HTTP en ronda ${round}: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const races = data.MRData.RaceTable.Races as JolpicaRace[];

      if (races.length > 0 && races[0].QualifyingResults) {
        allRaces.push(...races);
        console.log(`  ✅ Ronda ${round}: ${races[0].raceName} (${races[0].QualifyingResults.length} resultados)`);
      }
    } catch (error) {
      console.log(`  ⚠️  Error al obtener ronda ${round}:`, error);
      continue;
    }
  }

  console.log(`\n📊 Total de carreras con qualifying: ${allRaces.length}`);
  return allRaces;
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
      permanentNumber: parseInt(jolpicaDriver.permanentNumber),
      code: jolpicaDriver.code,
      givenName: jolpicaDriver.givenName,
      familyName: jolpicaDriver.familyName,
      dateOfBirth: jolpicaDriver.dateOfBirth ? new Date(jolpicaDriver.dateOfBirth) : null,
      nationality: jolpicaDriver.nationality,
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

async function seedQualifying2025() {
  console.log('🚀 Iniciando seed de qualifying 2025...\n');

  try {
    // 1. Get all races with qualifying from 2025
    const races = await fetchQualifyingResults(2025);

    if (races.length === 0) {
      console.log('⚠️  No se encontraron resultados de qualifying para 2025');
      return;
    }

    let totalResults = 0;
    let newResults = 0;
    let existingResults = 0;

    // 2. Process each race
    for (const race of races) {
      const year = parseInt(race.season);
      const round = parseInt(race.round);

      console.log(`\n📍 Procesando Qualifying: ${race.raceName} (Round ${round})`);

      // Find the race in the database
      const dbRace = await prisma.race.findUnique({
        where: {
          year_round: { year, round },
        },
      });

      if (!dbRace) {
        console.log(`  ⚠️  Carrera no encontrada en la base de datos: Round ${round}`);
        console.log(`  💡 Ejecuta primero el seed de calendario`);
        continue;
      }

      // 3. Process each qualifying result
      for (const result of race.QualifyingResults) {
        totalResults++;

        // Ensure driver and constructor exist
        const driver = await ensureDriverExists(result.Driver);
        const constructor = await ensureConstructorExists(result.Constructor);

        // Check if qualifying result already exists
        const existingResult = await prisma.qualifying.findFirst({
          where: {
            raceId: dbRace.id,
            driverId: driver.id,
          },
        });

        if (existingResult) {
          console.log(`  ⏭️  Qualifying ya existe: ${driver.familyName} - P${result.position}`);
          existingResults++;
          continue;
        }

        // Create qualifying result
        await prisma.qualifying.create({
          data: {
            raceId: dbRace.id,
            driverId: driver.id,
            constructorId: constructor.id,
            position: parseInt(result.position),
            q1: result.Q1 || null,
            q2: result.Q2 || null,
            q3: result.Q3 || null,
          },
        });

        newResults++;
        const q3Time = result.Q3 ? ` (Q3: ${result.Q3})` : result.Q2 ? ` (Q2: ${result.Q2})` : ` (Q1: ${result.Q1})`;
        console.log(`  ✅ Qualifying creado: ${driver.familyName} - P${result.position}${q3Time}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Seed de qualifying 2025 completado exitosamente!');
    console.log('='.repeat(60));
    console.log(`📊 Total de resultados procesados: ${totalResults}`);
    console.log(`➕ Nuevos resultados creados: ${newResults}`);
    console.log(`⏭️  Resultados ya existentes: ${existingResults}`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the seed
seedQualifying2025()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
