import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyResults2023() {
  console.log('\n📊 VERIFICACIÓN DE DATOS 2023\n');
  console.log('='.repeat(70) + '\n');

  // Verificar carreras 2023
  const races2023 = await prisma.race.findMany({
    where: { year: 2023 },
    orderBy: { round: 'asc' },
  });

  console.log('🏁 CARRERAS 2023:\n');
  console.log(`   Total de carreras: ${races2023.length}`);

  if (races2023.length > 0) {
    console.log(`   Primera carrera: Round ${races2023[0].round} - ${races2023[0].raceName}`);
    console.log(`   Última carrera: Round ${races2023[races2023.length - 1].round} - ${races2023[races2023.length - 1].raceName}`);
  }

  // Verificar resultados 2023
  const results2023 = await prisma.result.findMany({
    where: {
      race: {
        year: 2023,
      },
    },
  });

  console.log(`\n📈 RESULTADOS 2023:\n`);
  console.log(`   Total de resultados: ${results2023.length}`);
  console.log(`   Promedio de pilotos por carrera: ${(results2023.length / races2023.length).toFixed(1)}`);

  // Obtener el ganador de la primera carrera de 2023
  const firstRace2023 = await prisma.race.findUnique({
    where: {
      year_round: {
        year: 2023,
        round: 1,
      },
    },
    include: {
      circuit: true,
      results: {
        include: {
          driver: true,
          constructor: true,
        },
        orderBy: {
          positionOrder: 'asc',
        },
        take: 3,
      },
    },
  });

  if (firstRace2023) {
    console.log(`\n🏆 PRIMERA CARRERA 2023:\n`);
    console.log(`   Carrera: ${firstRace2023.raceName}`);
    console.log(`   Circuito: ${firstRace2023.circuit.name}`);
    console.log(`   Fecha: ${firstRace2023.date.toISOString().split('T')[0]}`);

    if (firstRace2023.results.length > 0) {
      console.log(`\n   Podio:`);
      firstRace2023.results.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.driver.givenName} ${result.driver.familyName} (${result.constructor.name}) - ${result.points} pts`);
      });
    }
  }

  // Verificar pilotos únicos en 2023
  const uniqueDrivers2023 = await prisma.result.findMany({
    where: {
      race: {
        year: 2023,
      },
    },
    distinct: ['driverId'],
    include: {
      driver: true,
    },
  });

  console.log(`\n👥 PILOTOS EN 2023:\n`);
  console.log(`   Total de pilotos: ${uniqueDrivers2023.length}`);
  console.log(`   Pilotos: ${uniqueDrivers2023.map(r => r.driver.familyName).sort().join(', ')}`);

  // Verificar equipos únicos en 2023
  const uniqueConstructors2023 = await prisma.result.findMany({
    where: {
      race: {
        year: 2023,
      },
    },
    distinct: ['constructorId'],
    include: {
      constructor: true,
    },
  });

  console.log(`\n🏎️  EQUIPOS EN 2023:\n`);
  console.log(`   Total de equipos: ${uniqueConstructors2023.length}`);
  console.log(`   Equipos: ${uniqueConstructors2023.map(r => r.constructor.name).sort().join(', ')}`);

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ VERIFICACIÓN COMPLETADA!\n');

  await prisma.$disconnect();
}

verifyResults2023();
