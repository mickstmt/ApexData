import { Suspense } from 'react';
import Link from 'next/link';
import { Trophy, Medal, Award } from 'lucide-react';
import { DriverAvatar, TeamLogo } from '@/components/ui/OptimizedImage';
import { teamColor } from '@/lib/team-colors';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { PointsEvolution, type EvolutionSeries } from '@/components/charts/PointsEvolution';
import { SeasonSelector } from '@/components/ui/SeasonSelector';
import { prisma } from '@/lib/prisma';

export const metadata = {
  title: 'Standings F1 | ApexData',
  description: 'Clasificación del campeonato de pilotos y constructores de F1',
};

interface StandingsPageProps {
  searchParams: Promise<{ season?: string }>;
}

interface DriverStanding {
  position: number;
  driver: string;
  points: number;
  team: string;
  wins: number;
}

interface ConstructorStanding {
  position: number;
  team: string;
  points: number;
  wins: number;
}

/**
 * Standings come straight from the stored championship tables, which Jolpica
 * publishes after every round. The page used to load a whole season of results
 * and add them up in memory, which also got the countback tie-breaks wrong.
 */
async function getStandings(year: number) {
  try {
    // Each table is written independently, so take the newest round present
    // in either one rather than assuming they advanced together.
    const [latestDriverRound, latestConstructorRound] = await Promise.all([
      prisma.driverStanding.findFirst({ where: { year }, orderBy: { round: 'desc' }, select: { round: true } }),
      // `team: false` keeps this literal from inheriting
      // Object.prototype.constructor, which Prisma rejects as a select key.
      prisma.constructorStanding.findFirst({
        where: { year },
        orderBy: { round: 'desc' },
        select: { round: true, team: false },
      }),
    ]);

    const round = Math.max(latestDriverRound?.round ?? 0, latestConstructorRound?.round ?? 0);

    if (round === 0) return { drivers: [], constructors: [], round: 0, leaders: [], failed: false };

    const teamOf = { select: { name: true, constructorId: true } } as const;

    const [driverRows, constructorRows, lastRoundEntries] = await Promise.all([
      prisma.driverStanding.findMany({
        where: { year, round },
        orderBy: [{ position: 'asc' }],
        include: { driver: true },
      }),
      prisma.constructorStanding.findMany({
        where: { year, round },
        orderBy: [{ position: 'asc' }],
        include: { team: true },
      }),
      // La parrilla de la última ronda cubre a casi todos los pilotos y se pide
      // a la vez que las tablas, así que no cuesta un viaje aparte.
      prisma.result.findMany({
        where: { race: { year, round } },
        select: { driverId: true, team: teamOf },
      }),
    ]);

    // A driver's team is not part of the standings table, so it is read from
    // that season's most recent race entry.
    //
    // Esto era un bucle que pedía ronda por ronda hasta tener el equipo de cada
    // piloto: hasta 24 viajes en serie, y con la base a ~500 ms por consulta,
    // la temporada 2015 tardaba 16 segundos en pintarse. Ahora la última ronda
    // viene con las tablas, y solo si falta alguien —un piloto lesionado, un
    // sustituto, alguien que se fue a mitad de año— se hace una segunda
    // consulta con el resto de la temporada. Dos viajes en el peor caso.
    const teamByDriver = new Map<string, { name: string; constructorId: string }>();
    for (const entry of lastRoundEntries) {
      if (!teamByDriver.has(entry.driverId)) {
        teamByDriver.set(entry.driverId, entry.team);
      }
    }

    if (teamByDriver.size < driverRows.length) {
      const earlier = await prisma.result.findMany({
        where: { race: { year, round: { lt: round } } },
        orderBy: { race: { round: 'desc' } },
        select: { driverId: true, team: teamOf },
      });

      for (const entry of earlier) {
        if (!teamByDriver.has(entry.driverId)) {
          teamByDriver.set(entry.driverId, entry.team);
        }
      }
    }

    return {
      failed: false,
      round,
      // El gráfico se pide aparte y se transmite cuando llegue: es una consulta
      // más que no debe retrasar la tabla, que es a lo que se viene.
      leaders: driverRows.slice(0, 5).map((row) => ({
        driverId: row.driverId,
        constructorId: teamByDriver.get(row.driverId)?.constructorId ?? null,
      })),
      drivers: driverRows.map((row) => ({
        position: row.position,
        driver: `${row.driver.givenName} ${row.driver.familyName}`,
        driverId: row.driver.driverId,
        nationality: row.driver.nationality,
        imageUrl: row.driver.imageUrl,
        team: teamByDriver.get(row.driverId)?.name ?? '—',
        constructorId: teamByDriver.get(row.driverId)?.constructorId ?? null,
        points: row.points,
        wins: row.wins,
      })),
      constructors: constructorRows.map((row) => ({
        position: row.position,
        team: row.team.name,
        constructorId: row.team.constructorId,
        logoUrl: row.team.logoUrl,
        points: row.points,
        wins: row.wins,
      })),
    };
  } catch (error) {
    console.error('Error fetching standings:', error);
    // Un fallo de base de datos no es una temporada sin datos, y hasta ahora
    // los dos acababan en el mismo mensaje: «no hay datos de clasificación».
    // Quien lo leía se iba creyendo que 2024 no está sembrada.
    return { drivers: [], constructors: [], round: 0, leaders: [], failed: true };
  }
}

/**
 * Evolución del campeonato, en su propio `<Suspense>`.
 *
 * Es una consulta más sobre `driverStanding`, y la tabla no la necesita para
 * pintarse. Separándola, la clasificación aparece en cuanto está y el gráfico
 * entra después, en vez de que todo espere a lo más lento.
 */
async function ChampionshipEvolution({
  year,
  round,
  leaders,
}: {
  year: number;
  round: number;
  leaders: { driverId: string; constructorId: string | null }[];
}) {
  const topDriverIds = leaders.map((leader) => leader.driverId);

  let rows;
  try {
    rows = await prisma.driverStanding.findMany({
      where: { year, driverId: { in: topDriverIds } },
      orderBy: { round: 'asc' },
      include: { driver: { select: { driverId: true, familyName: true } } },
    });
  } catch (error) {
    console.error('Error fetching championship evolution:', error);
    return null;
  }

  const evolution: EvolutionSeries[] = leaders
    .map(({ driverId, constructorId }) => {
      const own = rows.filter((row) => row.driverId === driverId);

      // Index by round: a driver who joined mid-season has no entry for the
      // early rounds, and mapping positionally would shift their whole line.
      const byRound = new Map(own.map((row) => [row.round, row.points]));
      let carried = 0;
      const points = Array.from({ length: round }, (_, index) => {
        carried = byRound.get(index + 1) ?? carried;
        return carried;
      });

      return { driverId, name: own[0]?.driver.familyName ?? '', constructorId, points };
    })
    .filter((series) => series.name !== '' && series.points.length > 1);

  if (evolution.length <= 1) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-1 font-display text-xl font-semibold">Evolución del campeonato</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Puntos acumulados de los cinco primeros. Los compañeros de equipo comparten color, así que
        el segundo va con línea discontinua.
      </p>
      <div className="rounded-xl border border-border bg-card p-4">
        <PointsEvolution series={evolution} rounds={round} />
      </div>
    </section>
  );
}

/** Mismo hueco que ocupará el gráfico, para que nada salte al llegar. */
function EvolutionSkeleton() {
  return (
    <section className="mb-10" aria-hidden>
      <div className="mb-1 h-7 w-64 animate-pulse rounded bg-muted" />
      <div className="mb-4 h-5 w-full max-w-xl animate-pulse rounded bg-muted" />
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="h-[280px] animate-pulse rounded bg-muted" />
      </div>
    </section>
  );
}

export default async function StandingsPage({ searchParams }: StandingsPageProps) {
  const params = await searchParams;
  const displayYear = params.season ? parseInt(params.season) : new Date().getFullYear();

  const {
    drivers: driversStandings,
    constructors: constructorsStandings,
    round,
    leaders,
    failed,
  } = await getStandings(displayYear);

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold md:text-5xl">
              Clasificación <span className="text-primary">{displayYear}</span>
            </h1>
          </div>
          <SeasonSelector currentSeason={displayYear} />
        </div>
        <p className="text-lg text-muted-foreground">
          Campeonato Mundial de Pilotos y Constructores
          {round > 0 && ` · tras la ronda ${round}`}
        </p>
      </div>

      {leaders.length > 1 && (
        <Suspense fallback={<EvolutionSkeleton />}>
          <ChampionshipEvolution year={displayYear} round={round} leaders={leaders} />
        </Suspense>
      )}

      {failed ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-12 text-center">
          <p className="mb-2 text-lg font-semibold">No se pudo consultar la clasificación</p>
          <p className="mb-6 text-muted-foreground">
            La base de datos no respondió. Los datos de {displayYear} siguen ahí; es la conexión la
            que ha fallado.
          </p>
          <Link
            href={`/standings?season=${displayYear}&r=${round}`}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reintentar
          </Link>
        </div>
      ) : driversStandings.length === 0 && constructorsStandings.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <p className="text-lg text-muted-foreground">
            No hay datos de clasificación disponibles para la temporada {displayYear}.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Drivers Standings */}
          <div>
            <h2 className="mb-6 text-2xl font-bold">
              <Medal className="mb-1 inline-block h-6 w-6 text-primary" /> Campeonato de Pilotos
            </h2>

            <div className="space-y-2">
              {driversStandings.map((entry) => {
                const medalIcon =
                  entry.position === 1 ? '🥇' :
                  entry.position === 2 ? '🥈' :
                  entry.position === 3 ? '🥉' : null;

                return (
                  <Link
                    key={entry.driverId}
                    href={`/drivers/${entry.driverId}`}
                    className={`relative flex items-center gap-4 overflow-hidden rounded-xl border p-4 pl-5 transition-colors ${
                      entry.position !== null && entry.position <= 3
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-card hover:border-primary'
                    }`}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ backgroundColor: teamColor(entry.constructorId).color }}
                    />
                    {/* Position */}
                    <div className="flex w-12 items-center justify-center">
                      {medalIcon ? (
                        <span className="text-2xl">{medalIcon}</span>
                      ) : (
                        <span className="text-xl font-bold tabular-nums text-muted-foreground">
                          {entry.position ?? '—'}
                        </span>
                      )}
                    </div>

                    <DriverAvatar src={entry.imageUrl} name={entry.driver} size="sm" />

                    {/* Driver info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-bold">
                        <CountryFlag nationality={entry.nationality} size={16} />
                        {entry.driver}
                      </div>
                      <div className="text-sm text-muted-foreground">{entry.team}</div>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <div className="font-display text-2xl font-bold tabular-nums text-primary">{entry.points}</div>
                      <div className="text-xs text-muted-foreground">pts</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Constructors Standings */}
          <div>
            <h2 className="mb-6 text-2xl font-bold">
              <Award className="mb-1 inline-block h-6 w-6 text-primary" /> Campeonato de Constructores
            </h2>

            <div className="space-y-2">
              {constructorsStandings.map((entry) => {
                const medalIcon =
                  entry.position === 1 ? '🥇' :
                  entry.position === 2 ? '🥈' :
                  entry.position === 3 ? '🥉' : null;

                return (
                  <Link
                    key={entry.constructorId}
                    href={`/constructors/${entry.constructorId}`}
                    className={`relative flex items-center gap-4 overflow-hidden rounded-xl border p-4 pl-5 transition-colors ${
                      entry.position !== null && entry.position <= 3
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-card hover:border-primary'
                    }`}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ backgroundColor: teamColor(entry.constructorId).color }}
                    />
                    {/* Position */}
                    <div className="flex w-12 items-center justify-center">
                      {medalIcon ? (
                        <span className="text-2xl">{medalIcon}</span>
                      ) : (
                        <span className="text-xl font-bold tabular-nums text-muted-foreground">
                          {entry.position ?? '—'}
                        </span>
                      )}
                    </div>

                    <TeamLogo src={entry.logoUrl} name={entry.team} size="sm" />

                    {/* Team name */}
                    <div className="flex-1 font-bold">{entry.team}</div>

                    {/* Points */}
                    <div className="text-right">
                      <div className="font-display text-2xl font-bold tabular-nums text-primary">{entry.points}</div>
                      <div className="text-xs text-muted-foreground">pts</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
