import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilaDeTiempos, ListaDeFilas } from '@/components/tabla/TablaDeTiempos';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { Skeleton } from '@/components/ui/Skeleton';
import { teamColor } from '@/lib/team-colors';

/** Consulta la clasificación; devuelve null si no hay datos o si falla. */
async function getStandings(year: number) {
  try {
    const latestRound = await prisma.driverStanding.findFirst({
      where: { year },
      orderBy: { round: 'desc' },
      select: { round: true },
    });

    if (!latestRound) return null;

    const [driverStandings, constructorStandings] = await Promise.all([
      prisma.driverStanding.findMany({
        where: { year, round: latestRound.round, position: { lte: 5 } },
        orderBy: { position: 'asc' },
        include: { driver: true },
      }),
      prisma.constructorStanding.findMany({
        where: { year, round: latestRound.round, position: { lte: 5 } },
        orderBy: { position: 'asc' },
        include: { team: true },
      }),
    ]);

    if (driverStandings.length === 0) return null;

    // Each driver's current team, for the colour stripe. Reads the season's
    // entries newest-first so a driver who sat out the last round still
    // resolves, rather than falling back to the grey placeholder.
    const teamByDriver = new Map<string, { name: string; constructorId: string; nationality: string }>();

    const entries = await prisma.result.findMany({
      where: {
        race: { year },
        driverId: { in: driverStandings.map((entry) => entry.driverId) },
      },
      orderBy: { race: { round: 'desc' } },
      select: {
        driverId: true,
        team: { select: { name: true, constructorId: true, nationality: true } },
      },
    });

    for (const entry of entries) {
      if (!teamByDriver.has(entry.driverId)) {
        teamByDriver.set(entry.driverId, {
          name: entry.team.name,
          constructorId: entry.team.constructorId,
          nationality: entry.team.nationality,
        });
      }
    }

    return { driverStandings, constructorStandings, teamByDriver };
  } catch (error) {
    // Que la clasificación falle no puede tumbar la home entera: la próxima
    // carrera y el último resultado ya se han enviado al navegador.
    console.error('Error loading championship standings:', error);
    return null;
  }
}

/**
 * Clasificación del campeonato en la home.
 *
 * Vive separado del resto de la página precisamente para poder envolverlo en
 * un `<Suspense>`: son dos o tres viajes más a la base de datos que antes se
 * hacían antes de enviar el primer byte, así que la próxima carrera —lo que la
 * gente viene a ver— esperaba por un dato secundario.
 */
export async function Championship({ year }: { year: number }) {
  const standings = await getStandings(year);

  if (!standings) return null;

  const { driverStandings, constructorStandings, teamByDriver } = standings;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Trophy className="h-5 w-5 text-primary" aria-hidden />
          Campeonato {year}
        </h2>
        <Link
          href={`/standings?season=${year}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Ver todo
        </Link>
      </div>

      {/* La misma fila que las tablas de dentro: dorsal, foto y las dos
          banderas. La portada usaba la fila vieja y se notaba al saltar de una
          a otra. */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <ListaDeFilas titulo="Campeonato de pilotos" rejilla="26px 3px 34px minmax(0,1fr) 58px">
          {driverStandings.map((entry) => {
            const team = teamByDriver.get(entry.driverId);

            return (
              <FilaDeTiempos
                key={entry.id}
                posicion={entry.position ?? '—'}
                dorsal={entry.driver.permanentNumber}
                equipo={team?.name ?? '—'}
                equipoId={team?.constructorId ?? null}
                equipoNacion={team?.nationality}
                piloto={{
                  nombre: `${entry.driver.givenName} ${entry.driver.familyName}`,
                  foto: entry.driver.imageUrl,
                  nacion: entry.driver.nationality,
                  href: `/drivers/${entry.driver.driverId}`,
                }}
                valor={entry.points}
                valorEtiqueta="pts"
                destacada={entry.position !== null && entry.position <= 3}
              />
            );
          })}
        </ListaDeFilas>
      </div>

      {constructorStandings.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Constructores</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {constructorStandings.map((entry) => (
              <Link
                key={entry.id}
                href={`/constructors/${entry.team.constructorId}`}
                transitionTypes={['nav-forward']}
                className="relative flex min-h-[48px] items-center gap-3 rounded-xl px-1 transition-colors hover:bg-accent/60"
              >
                <span className="w-5 shrink-0 text-center font-mono text-[13px] font-semibold tabular-nums text-muted-foreground">
                  {entry.position ?? '—'}
                </span>
                <span
                  aria-hidden
                  className="h-7 w-[3px] shrink-0 rounded-sm"
                  style={{ backgroundColor: teamColor(entry.team.constructorId).color }}
                />
                {/* La bandera de la escuderia, como en el resto de la app. */}
                <CountryFlag nationality={entry.team.nationality} size={14} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {entry.team.name}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[15px] font-semibold tabular-nums">
                    {entry.points}
                  </span>
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    pts
                  </span>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

export function ChampionshipSkeleton() {
  return (
    <section>
      <span role="status" className="sr-only">
        Cargando la clasificación del campeonato…
      </span>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-7 w-44" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 pt-4 sm:pt-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex min-h-[56px] items-center gap-3">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}