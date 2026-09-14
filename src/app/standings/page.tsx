import { Suspense } from 'react';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { TeamLogo } from '@/components/ui/OptimizedImage';
import { FilaDeTiempos, TarjetaDeTabla } from '@/components/tabla/TablaDeTiempos';
import { ProximaCarrera } from '@/components/home/ProximaCarrera';
import { teamColor } from '@/lib/team-colors';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { PointsEvolution, type EvolutionSeries } from '@/components/charts/PointsEvolution';
import { SeasonSelector } from '@/components/ui/SeasonSelector';
import { FlipRows } from '@/components/ui/FlipRows';
import { RollingNumber } from '@/components/ui/RollingNumber';
import { prisma } from '@/lib/prisma';
import { temporadaPorDefecto } from '@/lib/temporada';

export const metadata = {
  title: 'Standings F1 | ApexData',
  description: 'Clasificación del campeonato de pilotos y constructores de F1',
};

interface StandingsPageProps {
  searchParams: Promise<{ season?: string }>;
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

    const teamOf = { select: { name: true, constructorId: true, nationality: true } } as const;

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
    const teamByDriver = new Map<string, { name: string; constructorId: string; nationality: string }>();
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
        number: row.driver.permanentNumber,
        imageUrl: row.driver.imageUrl,
        team: teamByDriver.get(row.driverId)?.name ?? '—',
        constructorId: teamByDriver.get(row.driverId)?.constructorId ?? null,
        teamNationality: teamByDriver.get(row.driverId)?.nationality ?? null,
        points: row.points,
        wins: row.wins,
      })),
      constructors: constructorRows.map((row) => ({
        position: row.position,
        team: row.team.name,
        constructorId: row.team.constructorId,
        nationality: row.team.nationality,
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
    <section>
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
    <section aria-hidden>
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
  const displayYear = params.season ? parseInt(params.season) : await temporadaPorDefecto();

  const {
    drivers: driversStandings,
    constructors: constructorsStandings,
    round,
    leaders,
    failed,
  } = await getStandings(displayYear);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
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

      {failed ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-12 text-center">
          <p className="mb-2 text-lg font-semibold">No se pudo consultar la clasificación</p>
          <p className="mb-6 text-muted-foreground">
            La base de datos no respondió. Los datos de {displayYear} siguen ahí; es la conexión la
            que ha fallado.
          </p>
          {/* Un enlace normal, no <Link>: en el fallo `round` siempre vale 0,
              así que la URL era idéntica y el router no volvía a pedir nada.
              Una recarga completa sí reintenta la consulta. */}
          <a
            href={`/standings?season=${displayYear}`}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reintentar
          </a>
        </div>
      ) : driversStandings.length === 0 && constructorsStandings.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <p className="text-lg text-muted-foreground">
            No hay datos de clasificación disponibles para la temporada {displayYear}.
          </p>
        </div>
      ) : (
        /**
         * Los pilotos primero, y el resto a su alrededor.
         *
         * Antes esta página abría con el gráfico de evolución: 280 px de altura
         * antes de ver a nadie, en la pantalla a la que se entra para ver quién
         * va primero (punto 48). Ahora lo primero son los pilotos, los
         * constructores acompañan en una columna estrecha —diez filas de nombre
         * y puntos, que es justo lo que cabe ahí— y el gráfico queda debajo de
         * los pilotos, donde explica lo que ya se ha leído.
         *
         * El gráfico NO va en la columna de la derecha aunque sea lo que pide
         * la simetría: su dibujo mide 720 px de ancho y rotularlo a 320 deja
         * las cifras de los ejes ilegibles. Debajo de los pilotos le quedan
         * ~670, que es prácticamente su tamaño natural.
         */
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* Drivers Standings */}
          <div className="min-w-0 xl:col-start-1 xl:row-start-1">
            <FlipRows>
              <TarjetaDeTabla
                titulo="Campeonato de Pilotos"
                contexto={round > 0 ? `Tras la ronda ${round}` : undefined}
                columnas={['Victorias', 'Pts']}
                rejilla="26px 3px 34px minmax(0,1fr) 80px 58px"
              >
                {driversStandings.map((entry) => (
                  <FilaDeTiempos
                    key={entry.driverId}
                    idParaAnimar={entry.driverId}
                    posicion={entry.position ?? '—'}
                    dorsal={entry.number}
                    equipo={entry.team}
                    equipoId={entry.constructorId}
                    equipoNacion={entry.teamNationality}
                    piloto={{
                      nombre: entry.driver,
                      foto: entry.imageUrl,
                      nacion: entry.nationality,
                      href: `/drivers/${entry.driverId}`,
                    }}
                    celdas={[entry.wins]}
                    valor={<RollingNumber value={entry.points} />}
                    valorEtiqueta="pts"
                    extra={[entry.wins === 1 ? '1 victoria' : `${entry.wins} victorias`]}
                    // El podio se marca con el fondo de la fila y no con una
                    // medalla de emoji. Decidido con el usuario sobre maqueta:
                    // las otras tres tablas lo hacen así, y una medalla en la
                    // tabla de la carrera —donde el primero es el ganador, no
                    // un medallista— no significaría lo mismo.
                    destacada={entry.position !== null && entry.position <= 3}
                  />
                ))}
              </TarjetaDeTabla>
            </FlipRows>
          </div>

          {/* La columna de contexto: cuándo se corre la siguiente y cómo va el
              campeonato de escuderías. */}
          <aside className="grid min-w-0 gap-6 xl:col-start-2 xl:row-start-1">
            <Suspense fallback={null}>
              <ProximaCarrera />
            </Suspense>

            <FlipRows>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
                  <h2 className="font-display text-base font-bold">Constructores</h2>
                  {round > 0 && (
                    <p className="whitespace-nowrap font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                      Tras la ronda {round}
                    </p>
                  )}
                </div>

                <ol>
                  {constructorsStandings.map((entry) => (
                    <li
                      key={entry.constructorId}
                      data-flip-id={entry.constructorId}
                      data-equipo={entry.constructorId}
                      className={`relative flex min-h-[52px] items-center gap-3 border-b border-border/60 px-3.5 py-2 last:border-b-0 transition-colors hover:bg-accent/60 ${
                        entry.position !== null && entry.position <= 3 ? 'bg-primary/[0.07]' : ''
                      }`}
                    >
                      {/* El enlace cubre la fila entera, no solo el nombre. */}
                      <Link
                        href={`/constructors/${entry.constructorId}`}
                        transitionTypes={['nav-forward']}
                        aria-label={entry.team}
                        className="absolute inset-0 z-[1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      />

                      <span className="w-5 shrink-0 text-center font-mono text-[13px] font-semibold tabular-nums text-muted-foreground">
                        {entry.position ?? '—'}
                      </span>

                      <span
                        aria-hidden
                        className="h-7 w-[3px] shrink-0 rounded-sm"
                        style={{ backgroundColor: teamColor(entry.constructorId).color }}
                      />

                      <TeamLogo
                        src={entry.logoUrl}
                        name={entry.team}
                        constructorId={entry.constructorId}
                        size="sm"
                      />

                      {/* La bandera de la escudería. Estaba en la base desde el
                          principio —`Team.nationality`, las 25 la tienen— y no
                          se enseñaba en ningún sitio. */}
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <CountryFlag nationality={entry.nationality} size={14} />
                        <span className="truncate text-sm font-semibold">{entry.team}</span>
                      </span>

                      <span className="shrink-0 text-right">
                        <RollingNumber
                          value={entry.points}
                          className="block font-mono text-[15px] font-semibold tabular-nums"
                        />
                        <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                          pts
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </FlipRows>
          </aside>

          {/* El gráfico, debajo de los pilotos y no encima. Se pide aparte y
              llega cuando llegue: la tabla no lo espera. */}
          {leaders.length > 1 && (
            <div className="min-w-0 xl:col-start-1 xl:row-start-2">
              <Suspense fallback={<EvolutionSkeleton />}>
                <ChampionshipEvolution year={displayYear} round={round} leaders={leaders} />
              </Suspense>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
