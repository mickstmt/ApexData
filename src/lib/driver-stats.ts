import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { aggregateSeasons, compareDuels, type SeasonAggregate } from '@/lib/results';

/**
 * Career and per-season figures for a driver, plus the head-to-head against
 * whoever shared the garage that season.
 *
 * Everything is derived from stored results rather than a running tally, so
 * the numbers stay correct when a season is re-seeded.
 */

export type SeasonRow = SeasonAggregate;

export interface HeadToHead {
  teammate: string;
  teammateId: string;
  year: number;
  race: { driver: number; teammate: number };
  qualifying: { driver: number; teammate: number };
}

export interface DriverStats {
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  bestFinish: number | null;
  fastestLaps: number;
  seasons: SeasonRow[];
  headToHead: HeadToHead | null;
}

export async function getDriverStats(driverPk: string): Promise<DriverStats> {
  const [results, poles, standings] = await Promise.all([
    prisma.result.findMany({
      where: { driverId: driverPk },
      // Ordered so the loop below can treat the last row of a season as its
      // most recent race when resolving mid-season team changes.
      orderBy: [{ race: { year: 'asc' } }, { race: { round: 'asc' } }],
      select: {
        position: true,
        points: true,
        rank: true,
        race: { select: { year: true, round: true } },
        team: { select: { name: true, constructorId: true } },
      },
    }),
    prisma.qualifying.count({ where: { driverId: driverPk, position: 1 } }),
    prisma.driverStanding.findMany({
      where: { driverId: driverPk },
      orderBy: [{ year: 'asc' }, { round: 'desc' }],
      select: { year: true, round: true, position: true },
    }),
  ]);

  // Final standing per season is the entry from its last recorded round.
  const finalPosition = new Map<number, number | null>();
  for (const standing of standings) {
    if (!finalPosition.has(standing.year)) finalPosition.set(standing.year, standing.position);
  }

  const seasons = aggregateSeasons(results, finalPosition);

  const finished = results.filter((r) => r.position !== null).map((r) => r.position!);

  return {
    races: results.length,
    wins: results.filter((r) => r.position === 1).length,
    podiums: results.filter((r) => r.position !== null && r.position <= 3).length,
    poles,
    points: Math.round(results.reduce((sum, r) => sum + r.points, 0) * 100) / 100,
    bestFinish: finished.length > 0 ? Math.min(...finished) : null,
    fastestLaps: results.filter((r) => r.rank === 1).length,
    seasons,
    headToHead: null,
  };
}

/**
 * Compares a driver with their team-mate over a season: who finished ahead
 * when both were classified, and who out-qualified whom.
 */
export async function getHeadToHead(
  driverPk: string,
  year: number
): Promise<HeadToHead | null> {
  const entries = await prisma.result.findMany({
    where: { driverId: driverPk, race: { year } },
    select: { constructorId: true, race: { select: { round: true } } },
  });

  if (entries.length === 0) return null;

  // The team the driver raced for most that season.
  const byTeam = new Map<string, number>();
  for (const entry of entries) {
    byTeam.set(entry.constructorId, (byTeam.get(entry.constructorId) ?? 0) + 1);
  }
  const teamPk = [...byTeam.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const [teamResults, teamQualifying] = await Promise.all([
    prisma.result.findMany({
      where: { constructorId: teamPk, race: { year } },
      select: {
        driverId: true,
        position: true,
        race: { select: { round: true } },
        driver: { select: { driverId: true, givenName: true, familyName: true } },
      },
    }),
    prisma.qualifying.findMany({
      where: { constructorId: teamPk, race: { year } },
      select: { driverId: true, position: true, race: { select: { round: true } } },
    }),
  ]);

  // The team-mate is whoever else drove for that team most often.
  const partnerCounts = new Map<string, number>();
  for (const entry of teamResults) {
    if (entry.driverId === driverPk) continue;
    partnerCounts.set(entry.driverId, (partnerCounts.get(entry.driverId) ?? 0) + 1);
  }

  const teammatePk = [...partnerCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!teammatePk) return null;

  const teammate = teamResults.find((entry) => entry.driverId === teammatePk)!.driver;

  return {
    teammate: `${teammate.givenName} ${teammate.familyName}`,
    teammateId: teammate.driverId,
    year,
    race: compareDuels(teamResults, driverPk, teammatePk),
    qualifying: compareDuels(teamQualifying, driverPk, teammatePk),
  };
}

/**
 * La última temporada en la que corrió, en una consulta suelta y barata.
 *
 * Existe para romper una cadena: el cara a cara necesita saber el año, y hasta
 * ahora lo sacaba del resultado de `getDriverStats`, así que no podía empezar
 * hasta que aquella terminaba. Preguntándolo aparte, las dos arrancan a la vez.
 */
async function ultimaTemporada(driverPk: string): Promise<number | null> {
  const ultimo = await prisma.result.findFirst({
    where: { driverId: driverPk },
    orderBy: [{ race: { year: 'desc' } }, { race: { round: 'desc' } }],
    select: { race: { select: { year: true } } },
  });

  return ultimo?.race.year ?? null;
}

/**
 * Todo lo que la ficha de piloto enseña por debajo de la cabecera, cacheado.
 *
 * Medido antes de esto contra la base de producción: la ficha tardaba **1,8–2,0
 * segundos** en completarse. El primer byte llegaba en 70 ms —el `<Suspense>` ya
 * estaba puesto y funcionaba—, pero las estadísticas se hacían esperar casi dos
 * segundos porque eran **tres viajes encadenados**: estadísticas, luego el
 * equipo de la última temporada, luego los datos de ese equipo.
 *
 * Aquí se arreglan las dos cosas. Una: el año de la última temporada se pregunta
 * en paralelo con las estadísticas, así que el cara a cara arranca antes.
 *
 * Y dos, la que de verdad cuenta: **esto es historia**. Lo que hizo Alonso en
 * 2011 no va a cambiar, y lo de esta temporada cambia como mucho una vez por
 * fin de semana. Guardarlo una hora convierte una página lenta en una instantánea
 * para todo el mundo menos para quien llegue primero — el mismo trato que ya
 * tienen la clasificación general y el selector de telemetría.
 */
export const getDriverPerformance = unstable_cache(
  async (driverPk: string) => {
    const [stats, ultima] = await Promise.all([
      getDriverStats(driverPk),
      ultimaTemporada(driverPk),
    ]);

    const headToHead = ultima ? await getHeadToHead(driverPk, ultima) : null;

    return { stats, headToHead };
  },
  ['driver-performance'],
  { revalidate: 3600 }
);

/**
 * La cabecera de la ficha: el piloto y sus diez últimos resultados.
 *
 * Se cachea por la misma razón que el resto, y porque era lo que quedaba
 * mandando: con el bloque de estadísticas ya guardado, esta consulta —un piloto
 * con diez resultados y sus uniones a carrera, circuito y equipo— seguía
 * corriéndose entera en cada visita y era la que fijaba el tiempo de la página.
 *
 * Devuelve `null` cuando no existe ese piloto, y eso también se guarda: una
 * dirección inventada no debería costar una consulta cada vez que alguien la
 * pida. Los errores NO se cachean —se dejan propagar— porque guardar un fallo
 * de conexión una hora convertiría un tropiezo en una avería.
 *
 * ## Por qué `select` y no `include`
 *
 * No es estilo: con `include` esto **no se cacheaba en absoluto**. La caché de
 * Next guarda serializando a JSON, y `Result.milliseconds` es un `BigInt`, que
 * `JSON.stringify` no sabe convertir. Cada petición lanzaba un
 * «Do not know how to serialize a BigInt» que moría como rechazo no capturado
 * —sin romper la página, así que no se veía— y la consulta se repetía entera:
 * 1.320 ms en cada visita, medidos, con la caché puesta y creyendo que
 * funcionaba.
 *
 * Enumerar los campos arregla las dos cosas a la vez: deja fuera el `BigInt` y
 * evita traer columnas que la ficha no enseña. Son los siete que se pintan.
 */
export const getDriverFicha = unstable_cache(
  async (driverId: string) => {
    return prisma.driver.findUnique({
      where: { driverId },
      select: {
        id: true,
        driverId: true,
        givenName: true,
        familyName: true,
        code: true,
        permanentNumber: true,
        dateOfBirth: true,
        nationality: true,
        url: true,
        imageUrl: true,
        results: {
          take: 10,
          orderBy: { race: { date: 'desc' } },
          select: {
            id: true,
            position: true,
            points: true,
            race: {
              select: {
                year: true,
                round: true,
                raceName: true,
                circuit: { select: { name: true } },
              },
            },
            team: { select: { constructorId: true, name: true } },
          },
        },
      },
    });
  },
  ['driver-ficha'],
  { revalidate: 3600 }
);
