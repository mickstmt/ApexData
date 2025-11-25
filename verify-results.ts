import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyResults() {
  console.log('\n🔍 Verificando datos de la temporada 2024...\n');

  const races = await prisma.race.findMany({
    where: { year: 2024 },
    include: {
      circuit: true,
      _count: {
        select: { results: true }
      }
    },
    orderBy: { round: 'asc' }
  });

  console.log(`✅ Total de carreras 2024: ${races.length}\n`);

  races.forEach((race) => {
    console.log(`Round ${race.round.toString().padStart(2, ' ')}: ${race.raceName.padEnd(35, ' ')} - ${race._count.results} resultados`);
  });

  console.log('\n' + '='.repeat(60));
  const totalResults = races.reduce((sum, race) => sum + race._count.results, 0);
  console.log(`Total de resultados: ${totalResults}`);
  console.log('='.repeat(60) + '\n');

  await prisma.$disconnect();
}

verifyResults();
