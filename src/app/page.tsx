import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CalendarDays, Flag } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimingRow } from '@/components/ui/TimingRow';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { DriverAvatar } from '@/components/ui/OptimizedImage';
import { RaceCountdown, LocalDateTime } from '@/components/home/RaceCountdown';
import { Championship, ChampionshipSkeleton } from '@/components/home/Championship';
import { raceStart } from '@/lib/race-time';
import { sesionesOrdenadas } from '@/lib/sesiones';

// The hub is "what is happening now", so it must never be baked at build time.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ApexData | Datos y telemetría de Fórmula 1',
  description: 'La próxima carrera, resultados y clasificación del campeonato en un vistazo.',
};

/**
 * Race hub: what a fan wants on a race weekend — what is next, what just
 * happened, and where the championship stands.
 */
async function getHubData() {
  const now = new Date();

  try {
    // Race.date is midnight UTC and the start time lives in Race.time, so the
    // window is widened by a day and the exact start is resolved in code.
    const yesterday = new Date(now.getTime() - 86_400_000);

    const [upcoming, lastRace] = await Promise.all([
      prisma.race.findMany({
        where: { date: { gte: yesterday } },
        orderBy: { date: 'asc' },
        take: 3,
        include: { circuit: true },
      }),
      prisma.race.findFirst({
        where: { date: { lte: now }, results: { some: {} } },
        orderBy: { date: 'desc' },
        include: {
          circuit: true,
          results: {
            where: { position: { lte: 3 } },
            orderBy: { position: 'asc' },
            include: { driver: true, team: true },
          },
        },
      }),
    ]);

    const nextRace = upcoming.find((race) => raceStart(race).getTime() >= now.getTime()) ?? null;

    const year = lastRace?.year ?? nextRace?.year ?? now.getFullYear();

    return { nextRace, lastRace, year };
  } catch (error) {
    console.error('Error loading race hub:', error);
    return null;
  }
}

export default async function Home() {
  const data = await getHubData();

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-3 text-3xl font-bold">ApexData</h1>
        <p className="text-muted-foreground">
          No se pudo conectar con la base de datos. Vuelve a intentarlo en un momento.
        </p>
      </div>
    );
  }

  const { nextRace, lastRace, year } = data;

  const nextSessions = nextRace ? sesionesOrdenadas(nextRace, raceStart(nextRace)) : [];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* El único h1 de la home vivía dentro del bloque de la próxima carrera:
          fuera de temporada la página arrancaba en h2 y no tenía título de
          nivel 1. Ahora lo tiene siempre; visible solo para quien lo necesita,
          porque en pantalla el titular es el nombre del gran premio. */}
      <h1 className="sr-only">ApexData · datos y telemetría de Fórmula 1</h1>

      {/* Next race */}
      {nextRace && (
        <section className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Próxima carrera
            </span>
          </div>

          <Card className="overflow-hidden">
            <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <CountryFlag country={nextRace.circuit.country} size={22} />
                  <span className="truncate text-sm text-muted-foreground">
                    {nextRace.circuit.name} · {nextRace.circuit.location}
                  </span>
                </div>

                <h2 className="mb-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
                  {nextRace.raceName}
                </h2>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    <LocalDateTime value={raceStart(nextRace).toISOString()} />
                  </span>
                  <RaceCountdown target={raceStart(nextRace).toISOString()} />
                </div>
              </div>

              {nextRace.circuit.imageUrl && (
                <div className="justify-self-center md:justify-self-end">
                  <Image
                    src={nextRace.circuit.imageUrl}
                    alt={`Trazado de ${nextRace.circuit.name}`}
                    width={220}
                    height={140}
                    className="h-28 w-auto opacity-90 brightness-0 dark:brightness-0 dark:invert"
                  />
                </div>
              )}
            </div>

            {nextSessions.length > 1 && (
              <div className="border-t border-border">
                <ul className="grid grid-cols-2 divide-border sm:grid-cols-3 lg:grid-cols-6">
                  {nextSessions.map(({ nombre, cuando }) => (
                    <li key={nombre} className="border-b border-r border-border p-3 last:border-r-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {nombre}
                      </div>
                      <div className="mt-0.5 text-sm">
                        <LocalDateTime value={cuando.toISOString()} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Last result */}
        {lastRace && lastRace.results.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                <Flag className="h-5 w-5 text-primary" aria-hidden />
                Último resultado
              </h2>
              <Link
                href={`/results/${lastRace.year}/${lastRace.round}`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Ver todo
              </Link>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CountryFlag country={lastRace.circuit.country} size={18} />
                  {lastRace.raceName}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {lastRace.results.map((result) => (
                  <TimingRow
                    key={result.id}
                    position={result.position}
                    constructorId={result.team.constructorId}
                    href={`/drivers/${result.driver.driverId}`}
                    value={result.points}
                    valueLabel="pts"
                  >
                    <DriverAvatar
                      src={result.driver.imageUrl}
                      name={`${result.driver.givenName} ${result.driver.familyName}`}
                      size="sm"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {result.driver.givenName} {result.driver.familyName}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {result.team.name}
                      </span>
                    </span>
                  </TimingRow>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Championship: se transmite aparte para no retrasar lo de arriba */}
        <Suspense fallback={<ChampionshipSkeleton />}>
          <Championship year={year} />
        </Suspense>
      </div>

      {/* Entry points to the rest of the app */}
      <section className="mt-12 flex flex-wrap gap-3">
        <Link href="/calendar">
          <Button variant="outline">
            Calendario completo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href="/circuits">
          <Button variant="outline">
            Circuitos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href="/analysis">
          <Button variant="outline">
            Telemetría
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
