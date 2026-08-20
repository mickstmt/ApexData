/**
 * Compara una temporada de Jolpica con lo que hay guardado, **sin escribir**.
 *
 * Existe porque la única base configurada es la de producción: antes de
 * confiar en que `seed:all --todas` reconstruye lo que hay, conviene saber si
 * volver a sembrar una temporada vieja cambiaría algo. Si no cambia nada, el
 * sembrador es idempotente sobre ella y ejecutarlo es seguro.
 *
 * Uso: npx tsx scripts/seed/comparar.ts 2012
 */

import { prisma, fetchJolpica, type JolpicaRace } from './jolpica';
import { classifiedPosition } from '../../src/lib/results';

interface RaceTableResponse {
  MRData: { RaceTable: { Races: JolpicaRace[] } };
}

async function main() {
  const year = Number(process.argv[2]);
  if (!Number.isInteger(year)) {
    console.error('Uso: npx tsx scripts/seed/comparar.ts <año>');
    process.exit(1);
  }

  const calendario = await fetchJolpica<RaceTableResponse>(`/${year}.json`);
  const carreras = calendario?.MRData.RaceTable.Races ?? [];
  console.log(`Jolpica: ${carreras.length} carreras en ${year}`);

  const enBase = await prisma.race.count({ where: { year } });
  console.log(`Base:    ${enBase} carreras en ${year}`);

  let comparados = 0;
  let diferencias = 0;
  let sinFila = 0;

  for (let round = 1; round <= carreras.length; round++) {
    const datos = await fetchJolpica<RaceTableResponse>(`/${year}/${round}/results.json`);
    const carrera = datos?.MRData.RaceTable.Races?.[0];
    if (!carrera?.Results?.length) continue;

    const fila = await prisma.race.findUnique({
      where: { year_round: { year, round } },
      select: {
        raceName: true,
        results: {
          select: {
            position: true,
            positionText: true,
            grid: true,
            points: true,
            driver: { select: { driverId: true } },
          },
        },
      },
    });

    if (!fila) {
      console.log(`   R${round}: no está en la base`);
      sinFila++;
      continue;
    }

    const guardados = new Map(fila.results.map((r) => [r.driver.driverId, r]));

    for (const resultado of carrera.Results) {
      const guardado = guardados.get(resultado.Driver.driverId);
      comparados++;

      if (!guardado) {
        console.log(`   R${round} ${resultado.Driver.driverId}: falta en la base`);
        diferencias++;
        continue;
      }

      const esperado = {
        position: classifiedPosition(resultado.positionText),
        grid: parseInt(resultado.grid, 10),
        points: parseFloat(resultado.points),
      };

      if (
        guardado.position !== esperado.position ||
        guardado.grid !== esperado.grid ||
        guardado.points !== esperado.points
      ) {
        console.log(
          `   R${round} ${resultado.Driver.driverId}: base ${guardado.position}/${guardado.grid}/${guardado.points} vs Jolpica ${esperado.position}/${esperado.grid}/${esperado.points}`
        );
        diferencias++;
      }
    }
  }

  console.log(`\nComparados ${comparados} resultados`);
  console.log(`Diferencias: ${diferencias} | carreras ausentes: ${sinFila}`);
  console.log(
    diferencias === 0 && sinFila === 0
      ? 'Volver a sembrar esta temporada no cambiaria nada.'
      : 'Volver a sembrar esta temporada CAMBIARIA datos: revisar antes.'
  );
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
