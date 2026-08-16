/**
 * Quick inventory of what is actually loaded in the database.
 *
 * Usage: npm run db:check
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Estado de la base de datos ===\n');

  const seasons = await prisma.season.findMany({ orderBy: { year: 'desc' } });
  const withRaces: Array<{ year: number; races: number }> = [];

  for (const season of seasons) {
    const races = await prisma.race.count({ where: { year: season.year } });
    if (races > 0) withRaces.push({ year: season.year, races });
  }

  console.log(`📅 Temporadas registradas: ${seasons.length}`);
  console.log(`   Con carreras cargadas: ${withRaces.length}\n`);

  console.log('🏁 Cobertura por temporada:');
  for (const { year, races } of withRaces) {
    const [results, qualifying, sprints, driverStandings] = await Promise.all([
      prisma.result.count({ where: { race: { year } } }),
      prisma.qualifying.count({ where: { race: { year } } }),
      prisma.sprintResult.count({ where: { race: { year } } }),
      prisma.driverStanding.count({ where: { year } }),
    ]);

    const leader = await prisma.driverStanding.findFirst({
      where: { year, position: 1 },
      orderBy: { round: 'desc' },
      include: { driver: true },
    });

    console.log(
      `   ${year}: ${String(races).padStart(2)} carreras · ${String(results).padStart(3)} resultados · ` +
        `${String(qualifying).padStart(3)} quali · ${String(sprints).padStart(2)} sprint · ` +
        `${String(driverStandings).padStart(3)} standings` +
        (leader ? ` · líder: ${leader.driver.familyName} (${leader.points} pts)` : '')
    );
  }

  const [drivers, constructors, circuits] = await Promise.all([
    prisma.driver.count(),
    prisma.constructor.count(),
    prisma.circuit.count(),
  ]);

  const [withPhoto, withLogo, withLayout] = await Promise.all([
    prisma.driver.count({ where: { imageUrl: { not: null } } }),
    prisma.constructor.count({ where: { logoUrl: { not: null } } }),
    prisma.circuit.count({ where: { imageUrl: { not: null } } }),
  ]);

  console.log('\n👤 Entidades e imágenes:');
  console.log(`   Pilotos:    ${String(drivers).padStart(4)} · ${withPhoto} con foto`);
  console.log(`   Equipos:    ${String(constructors).padStart(4)} · ${withLogo} con logo`);
  console.log(`   Circuitos:  ${String(circuits).padStart(4)} · ${withLayout} con trazado`);
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
