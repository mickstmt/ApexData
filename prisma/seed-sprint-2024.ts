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

interface JolpicaSprintResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  grid: string;
  laps: string;
  status: string;
  Time?: {
    millis: string;
    time: string;
  };
  FastestLap?: {
    rank: string;
    lap: string;
    Time: {
      time: string;
    };
  };
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
  SprintResults: JolpicaSprintResult[];
}

async function fetchSprintRaces(year: number) {
  console.log(`\n🔍 Obteniendo carreras sprint de la temporada ${year}...`);

  const url = `${JOLPICA_BASE_URL}/${year}/sprint.json?limit=100`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const races = data.MRData.RaceTable.Races as JolpicaRace[];

    console.log(`✅ Se encontraron ${races.length} carreras con sprint\n`);
    return races;
  } catch (error) {
    console.error(`❌ Error al obtener carreras sprint:`, error);
    throw error;
  }
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

async function seedSprint2024() {
  console.log('🚀 Iniciando seed de sprint races 2024...\n');

  try {
    // 1. Obtener todas las carreras con sprint de 2024
    const races = await fetchSprintRaces(2024);

    if (races.length === 0) {
      console.log('⚠️  No se encontraron carreras sprint para 2024');
      return;
    }

    let totalResults = 0;
    let newResults = 0;
    let existingResults = 0;

    // 2. Procesar cada carrera sprint
    for (const race of races) {
      const year = parseInt(race.season);
      const round = parseInt(race.round);

      console.log(`\n📍 Procesando Sprint: ${race.raceName} (Round ${round})`);

      // Buscar la carrera en la base de datos
      const dbRace = await prisma.race.findUnique({
        where: {
          year_round: { year, round },
        },
      });

      if (!dbRace) {
        console.log(`  ⚠️  Carrera no encontrada en la base de datos: Round ${round}`);
        console.log(`  💡 Ejecuta primero el seed de calendario y resultados`);
        continue;
      }

      // 3. Procesar cada resultado de sprint
      for (const result of race.SprintResults) {
        totalResults++;

        // Asegurar que existan el piloto y constructor
        const driver = await ensureDriverExists(result.Driver);
        const constructor = await ensureConstructorExists(result.Constructor);

        // Verificar si el resultado de sprint ya existe
        const existingResult = await prisma.sprintResult.findFirst({
          where: {
            raceId: dbRace.id,
            driverId: driver.id,
          },
        });

        if (existingResult) {
          console.log(`  ⏭️  Sprint result ya existe: ${driver.familyName} - P${result.positionText}`);
          existingResults++;
          continue;
        }

        // Crear el resultado de sprint
        await prisma.sprintResult.create({
          data: {
            raceId: dbRace.id,
            driverId: driver.id,
            constructorId: constructor.id,
            position: result.position === 'R' || result.position === 'D' ? null : parseInt(result.position),
            positionText: result.positionText,
            positionOrder: result.position === 'R' || result.position === 'D' ? 99 : parseInt(result.position),
            points: parseFloat(result.points),
            grid: parseInt(result.grid),
            laps: parseInt(result.laps),
            status: result.status,
            statusId: result.status === 'Finished' ? 1 : 2,
            time: result.Time?.time || null,
            milliseconds: result.Time?.millis ? BigInt(result.Time.millis) : null,
            fastestLap: result.FastestLap ? parseInt(result.FastestLap.lap) : null,
            fastestLapTime: result.FastestLap?.Time.time || null,
          },
        });

        newResults++;
        console.log(`  ✅ Sprint result creado: ${driver.familyName} - P${result.positionText} (${result.points} pts)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Seed de sprint races 2024 completado exitosamente!');
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

// Ejecutar el seed
seedSprint2024()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
