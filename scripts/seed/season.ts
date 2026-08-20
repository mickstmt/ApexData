/**
 * Seeds one or more seasons from Jolpica: calendar, race results, qualifying
 * and sprints. Replaces the per-season copies this project used to keep.
 *
 * Usage:
 *   npx tsx scripts/seed/season.ts 2026
 *   npx tsx scripts/seed/season.ts 2023 2024 2025 2026
 *   npx tsx scripts/seed/season.ts --current      (current year only)
 *   npx tsx scripts/seed/season.ts --todas        (todo lo que cubre el proyecto)
 */

import {
  prisma,
  fetchJolpica,
  upsertDriver,
  upsertConstructor,
  upsertRace,
  classifiedPosition,
  type JolpicaRace,
} from './jolpica';
import { anosPedidos, PRIMERA_TEMPORADA_SPRINT } from './temporadas';

interface RaceTableResponse {
  MRData: { RaceTable: { Races: JolpicaRace[] } };
}

async function seedCalendar(year: number) {
  console.log(`\n📅 Calendario ${year}`);

  const data = await fetchJolpica<RaceTableResponse>(`/${year}.json`);
  const races = data?.MRData.RaceTable.Races ?? [];

  if (races.length === 0) {
    console.log('   Sin calendario publicado todavía.');
    return [];
  }

  for (const race of races) {
    await upsertRace(race);
  }

  console.log(`   ✅ ${races.length} carreras`);
  return races;
}

async function seedRaceResults(year: number, rounds: number) {
  console.log(`\n🏁 Resultados de carrera ${year}`);
  let seeded = 0;
  let skipped = 0;

  for (let round = 1; round <= rounds; round++) {
    const data = await fetchJolpica<RaceTableResponse>(`/${year}/${round}/results.json`);
    const race = data?.MRData.RaceTable.Races?.[0];

    if (!race?.Results?.length) {
      skipped++;
      continue;
    }

    const dbRace = await upsertRace(race);

    for (const result of race.Results) {
      const driver = await upsertDriver(result.Driver);
      const constructor = await upsertConstructor(result.Constructor);

      const data = {
        position: classifiedPosition(result.positionText),
        positionText: result.positionText,
        positionOrder: parseInt(result.position, 10) || 99,
        points: parseFloat(result.points),
        grid: parseInt(result.grid, 10),
        laps: parseInt(result.laps, 10),
        status: result.status,
        statusId: result.status === 'Finished' ? 1 : 2,
        time: result.Time?.time || null,
        milliseconds: result.Time?.millis ? BigInt(result.Time.millis) : null,
        fastestLap: result.FastestLap ? parseInt(result.FastestLap.lap, 10) : null,
        fastestLapTime: result.FastestLap?.Time.time || null,
        fastestLapSpeed: result.FastestLap?.AverageSpeed?.speed || null,
        rank: result.FastestLap?.rank ? parseInt(result.FastestLap.rank, 10) : null,
      };

      await prisma.result.upsert({
        where: { raceId_driverId: { raceId: dbRace.id, driverId: driver.id } },
        update: { ...data, constructorId: constructor.id },
        create: { ...data, raceId: dbRace.id, driverId: driver.id, constructorId: constructor.id },
      });
    }

    seeded++;
    console.log(`   ✅ R${round} ${race.raceName} (${race.Results.length} pilotos)`);
  }

  console.log(`   ${seeded} carreras cargadas, ${skipped} rondas sin resultados`);
}

async function seedQualifying(year: number, rounds: number) {
  console.log(`\n⏱️  Clasificación ${year}`);
  let seeded = 0;

  for (let round = 1; round <= rounds; round++) {
    const data = await fetchJolpica<RaceTableResponse>(`/${year}/${round}/qualifying.json`);
    const race = data?.MRData.RaceTable.Races?.[0];

    if (!race?.QualifyingResults?.length) continue;

    const dbRace = await upsertRace(race);

    for (const result of race.QualifyingResults) {
      const driver = await upsertDriver(result.Driver);
      const constructor = await upsertConstructor(result.Constructor);

      const data = {
        position: parseInt(result.position, 10),
        q1: result.Q1 || null,
        q2: result.Q2 || null,
        q3: result.Q3 || null,
      };

      await prisma.qualifying.upsert({
        where: { raceId_driverId: { raceId: dbRace.id, driverId: driver.id } },
        update: { ...data, constructorId: constructor.id },
        create: { ...data, raceId: dbRace.id, driverId: driver.id, constructorId: constructor.id },
      });
    }

    seeded++;
  }

  console.log(`   ✅ ${seeded} sesiones`);
}

async function seedSprints(year: number, rounds: number) {
  // Antes de 2021 no hubo carreras al sprint: preguntarlo ronda por ronda son
  // ~20 peticiones por temporada que siempre vuelven vacias, y por las once
  // temporadas anteriores pasan de doscientas.
  if (year < PRIMERA_TEMPORADA_SPRINT) {
    console.log(`   ${year}: no habia sprints todavia.`);
    return;
  }

  console.log(`\n⚡ Sprints ${year}`);
  let seeded = 0;

  for (let round = 1; round <= rounds; round++) {
    const data = await fetchJolpica<RaceTableResponse>(`/${year}/${round}/sprint.json`);
    const race = data?.MRData.RaceTable.Races?.[0];

    if (!race?.SprintResults?.length) continue;

    const dbRace = await upsertRace(race);

    for (const result of race.SprintResults) {
      const driver = await upsertDriver(result.Driver);
      const constructor = await upsertConstructor(result.Constructor);

      const data = {
        position: classifiedPosition(result.positionText),
        positionText: result.positionText,
        positionOrder: parseInt(result.position, 10) || 99,
        points: parseFloat(result.points),
        grid: parseInt(result.grid, 10),
        laps: parseInt(result.laps, 10),
        status: result.status,
        statusId: result.status === 'Finished' ? 1 : 2,
        time: result.Time?.time || null,
        milliseconds: result.Time?.millis ? BigInt(result.Time.millis) : null,
        fastestLap: result.FastestLap ? parseInt(result.FastestLap.lap, 10) : null,
        fastestLapTime: result.FastestLap?.Time.time || null,
      };

      await prisma.sprintResult.upsert({
        where: { raceId_driverId: { raceId: dbRace.id, driverId: driver.id } },
        update: { ...data, constructorId: constructor.id },
        create: { ...data, raceId: dbRace.id, driverId: driver.id, constructorId: constructor.id },
      });
    }

    seeded++;
    console.log(`   ✅ R${round} sprint`);
  }

  console.log(`   ${seeded} sprints`);
}

async function seedSeason(year: number) {
  console.log(`\n${'='.repeat(55)}\n🏎️  TEMPORADA ${year}\n${'='.repeat(55)}`);

  const calendar = await seedCalendar(year);

  if (calendar.length === 0) {
    console.log('   Nada más que hacer sin calendario.');
    return;
  }

  const rounds = calendar.length;

  await seedRaceResults(year, rounds);
  await seedQualifying(year, rounds);
  await seedSprints(year, rounds);
}

async function main() {
  const years = anosPedidos(process.argv.slice(2));

  if (years.length === 0) {
    console.error('Uso: npx tsx scripts/seed/season.ts <año> [año...] | --current | --todas');
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
