/**
 * Base seed: every circuit Jolpica knows about, plus a Season row per year.
 *
 * Race data lives in scripts/seed/season.ts, which seeds one or more seasons
 * (calendar, results, qualifying and sprints).
 *
 * Usage: npm run db:seed
 */

import { prisma, fetchJolpica, upsertCircuit, type JolpicaCircuit } from '../scripts/seed/jolpica';

interface CircuitTableResponse {
  MRData: { total: string; CircuitTable: { Circuits: JolpicaCircuit[] } };
}

interface SeasonTableResponse {
  MRData: { SeasonTable: { Seasons: Array<{ season: string; url: string }> } };
}

async function seedCircuits() {
  console.log('📍 Circuitos');

  let offset = 0;
  let total = 0;
  let seeded = 0;

  do {
    const data = await fetchJolpica<CircuitTableResponse>(`/circuits.json?limit=100&offset=${offset}`);
    if (!data) break;

    total = parseInt(data.MRData.total, 10);

    for (const circuit of data.MRData.CircuitTable.Circuits) {
      await upsertCircuit(circuit);
      seeded++;
    }

    offset += 100;
  } while (offset < total);

  console.log(`   ✅ ${seeded} circuitos`);
}

async function seedSeasons() {
  console.log('\n📅 Temporadas');

  const currentYear = new Date().getFullYear();
  let offset = 0;
  let seeded = 0;

  // Jolpica pages seasons 30 at a time; walk until the current one.
  while (true) {
    const data = await fetchJolpica<SeasonTableResponse>(`/seasons.json?limit=100&offset=${offset}`);
    const seasons = data?.MRData.SeasonTable.Seasons ?? [];

    if (seasons.length === 0) break;

    for (const season of seasons) {
      const year = parseInt(season.season, 10);
      if (year > currentYear) continue;

      await prisma.season.upsert({
        where: { year },
        update: { url: season.url },
        create: { year, url: season.url },
      });
      seeded++;
    }

    offset += 100;
  }

  console.log(`   ✅ ${seeded} temporadas`);
}

async function main() {
  console.log('🌱 Seed base\n');

  await seedCircuits();
  await seedSeasons();

  console.log('\n✅ Listo. Siguiente paso: npm run seed:season -- 2026\n');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
