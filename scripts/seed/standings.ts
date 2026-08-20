/**
 * Seeds championship standings after every round of a season.
 *
 * The app used to recompute standings on each request by loading a whole
 * season of results into memory. Jolpica publishes the official tables — which
 * also settle countback tie-breaks correctly — so they are stored instead.
 *
 * Usage:
 *   npx tsx scripts/seed/standings.ts 2026
 *   npx tsx scripts/seed/standings.ts 2023 2024 2025 2026
 */

import { prisma, fetchJolpica, upsertDriver, upsertConstructor, type JolpicaDriver, type JolpicaConstructor } from './jolpica';
import { anosPedidos } from './temporadas';

interface StandingsResponse<T> {
  MRData: { StandingsTable: { StandingsLists: Array<{ round: string } & T> } };
}

interface DriverStandingEntry {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: JolpicaDriver;
}

interface ConstructorStandingEntry {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: JolpicaConstructor;
}

async function seedRound(year: number, round: number) {
  const [driverData, constructorData] = await Promise.all([
    fetchJolpica<StandingsResponse<{ DriverStandings: DriverStandingEntry[] }>>(
      `/${year}/${round}/driverStandings.json?limit=100`
    ),
    fetchJolpica<StandingsResponse<{ ConstructorStandings: ConstructorStandingEntry[] }>>(
      `/${year}/${round}/constructorStandings.json?limit=100`
    ),
  ]);

  const driverList = driverData?.MRData.StandingsTable.StandingsLists[0];
  const constructorList = constructorData?.MRData.StandingsTable.StandingsLists[0];

  if (!driverList && !constructorList) return false;

  for (const entry of driverList?.DriverStandings ?? []) {
    const driver = await upsertDriver(entry.Driver);
    const data = {
      // Unclassified entries come through as positionText "-" with no position.
      position: /^\d+$/.test(entry.position) ? parseInt(entry.position, 10) : null,
      positionText: entry.positionText,
      points: parseFloat(entry.points),
      wins: parseInt(entry.wins, 10),
    };

    await prisma.driverStanding.upsert({
      where: { year_round_driverId: { year, round, driverId: driver.id } },
      update: data,
      create: { ...data, year, round, driver: { connect: { id: driver.id } } },
    });
  }

  for (const entry of constructorList?.ConstructorStandings ?? []) {
    const constructor = await upsertConstructor(entry.Constructor);
    const data = {
      // Unclassified entries come through as positionText "-" with no position.
      position: /^\d+$/.test(entry.position) ? parseInt(entry.position, 10) : null,
      positionText: entry.positionText,
      points: parseFloat(entry.points),
      wins: parseInt(entry.wins, 10),
    };

    await prisma.constructorStanding.upsert({
      where: { year_round_constructorId: { year, round, constructorId: constructor.id } },
      update: data,
      create: { ...data, year, round, constructorId: constructor.id },
    });
  }

  return true;
}

async function seedSeason(year: number) {
  console.log(`\n📊 Clasificaciones ${year}`);

  // Only rounds that actually ran have standings.
  const rounds = await prisma.race.count({ where: { year } });
  let seeded = 0;

  for (let round = 1; round <= rounds; round++) {
    const ok = await seedRound(year, round);
    if (!ok) continue;

    seeded++;
    process.stdout.write(`\r   Rondas cargadas: ${seeded}`);
  }

  console.log(`\r   ✅ ${seeded} rondas con clasificación`);
}

async function main() {
  const years = anosPedidos(process.argv.slice(2));

  if (years.length === 0) {
    console.error('Uso: npx tsx scripts/seed/standings.ts <año> [año...] | --current | --todas');
    process.exit(1);
  }

  console.log(`Temporadas: ${years[0]}–${years[years.length - 1]} (${years.length})`);

  // `--listar` enseña qué se sembraria y se va sin tocar nada: la unica base
  // configurada es la de produccion, asi que conviene poder mirar antes.
  if (process.argv.includes('--listar')) {
    console.log(years.join(' '));
    return;
  }

  for (const year of years) {
    await seedSeason(year);
  }

  console.log('\n✅ Listo.\n');
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
