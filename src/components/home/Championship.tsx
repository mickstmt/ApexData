import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimingRow } from '@/components/ui/TimingRow';
import { DriverAvatar } from '@/components/ui/OptimizedImage';
import { Skeleton } from '@/components/ui/Skeleton';

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
    const teamByDriver = new Map<string, { name: string; constructorId: string }>();

    const entries = await prisma.result.findMany({
      where: {
        race: { year },
        driverId: { in: driverStandings.map((entry) => entry.driverId) },
      },
      orderBy: { race: { round: 'desc' } },
      select: {
        driverId: true,
        team: { select: { name: true, constructorId: true } },
      },
    });

    for (const entry of entries) {
      if (!teamByDriver.has(entry.driverId)) {
        teamByDriver.set(entry.driverId, {
          name: entry.team.name,
          constructorId: entry.team.constructorId,
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

      <Card>
        <CardContent className="flex flex-col gap-2 pt-4 sm:pt-5">
          {driverStandings.map((entry) => {
            const team = teamByDriver.get(entry.driverId);

            return (
              <TimingRow
                key={entry.id}
                position={entry.position}
                constructorId={team?.constructorId}
                href={`/drivers/${entry.driver.driverId}`}
                value={entry.points}
                valueLabel="pts"
              >
                <DriverAvatar
                  src={entry.driver.imageUrl}
                  name={`${entry.driver.givenName} ${entry.driver.familyName}`}
                  size="sm"
                />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {entry.driver.givenName} {entry.driver.familyName}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {team?.name ?? '—'}
                  </span>
                </span>
              </TimingRow>
            );
          })}
        </CardContent>
      </Card>

      {constructorStandings.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Constructores</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {constructorStandings.map((entry) => (
              <TimingRow
                key={entry.id}
                position={entry.position}
                constructorId={entry.team.constructorId}
                href={`/constructors/${entry.team.constructorId}`}
                value={entry.points}
                valueLabel="pts"
              >
                <span className="truncate font-semibold">{entry.team.name}</span>
              </TimingRow>
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