import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Flag, Hash, Trophy, Medal, Timer, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DriverAvatar } from '@/components/ui/OptimizedImage';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { TimingRow } from '@/components/ui/TimingRow';
import { getDriverStats, getHeadToHead } from '@/lib/driver-stats';
import { teamColor } from '@/lib/team-colors';
import { driverAge, formatBirthDate } from '@/lib/driver-age';

// Los datos de esta página cambian como mucho una vez por carrera, así que
// una hora de caché evita ir a Virginia en cada visita sin que nadie note
// nunca un dato viejo.
export const revalidate = 3600;

interface DriverDetailPageProps {
  params: Promise<{ driverId: string }>;
}

export async function generateMetadata({ params }: DriverDetailPageProps) {
  const { driverId } = await params;

  try {
    const driver = await prisma.driver.findUnique({ where: { driverId } });

    if (driver) {
      return {
        title: `${driver.givenName} ${driver.familyName} | ApexData`,
        description: `Estadísticas, temporadas y resultados de ${driver.givenName} ${driver.familyName} en la Fórmula 1.`,
      };
    }
  } catch {
    // Sin base de datos el título genérico basta.
  }

  return { title: 'Piloto no encontrado | ApexData' };
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-xl border border-border bg-card p-4">
      {/* Mismo velo que la barra superior: invisible sin equipo elegido. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-ambiente/[0.12]" />
      <div className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <div className="font-mono text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

/**
 * Todo lo que exige consultar más allá de la ficha: las estadísticas de
 * carrera, el cara a cara con el compañero y la tabla por temporada.
 *
 * Vive en su propio `<Suspense>` porque son cinco consultas más —y encadenadas
 * entre sí, porque el cara a cara necesita saber antes cuál fue la última
 * temporada—. Con la base de datos a 100 ms de ida y vuelta en el mejor caso,
 * eso era medio segundo largo en el que no se veía ni el nombre del piloto.
 */
async function DriverPerformance({
  driverId,
  accentColor,
}: {
  driverId: string;
  accentColor: string;
}) {
  const stats = await getDriverStats(driverId);
  const latestSeason = stats.seasons[0];
  const headToHead = latestSeason ? await getHeadToHead(driverId, latestSeason.year) : null;

  return (
    <>
      {/* Estadísticas de carrera */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile icon={Flag} label="Carreras" value={stats.races} />
        <StatTile icon={Trophy} label="Victorias" value={stats.wins} />
        <StatTile icon={Medal} label="Podios" value={stats.podiums} />
        <StatTile icon={Timer} label="Poles" value={stats.poles} />
        <StatTile icon={Zap} label="V. rápidas" value={stats.fastestLaps} />
        <StatTile icon={Trophy} label="Puntos" value={stats.points} />
      </div>

      <p className="mb-10 text-sm text-muted-foreground">
        Calculado sobre las temporadas cargadas en ApexData
        {stats.seasons.length > 0 &&
          ` (${stats.seasons[stats.seasons.length - 1].year}–${stats.seasons[0].year})`}
        .
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cara a cara con el compañero */}
        {headToHead && (
          <Card>
            <CardHeader>
              <CardTitle>Cara a cara {headToHead.year}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Frente a{' '}
                <Link
                  href={`/drivers/${headToHead.teammateId}`}
                  className="text-foreground hover:underline"
                >
                  {headToHead.teammate}
                </Link>
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {(
                [
                  ['En carrera', headToHead.race],
                  ['En clasificación', headToHead.qualifying],
                ] as const
              ).map(([label, duel]) => {
                const total = duel.driver + duel.teammate;
                const share = total > 0 ? (duel.driver / total) * 100 : 50;

                return (
                  <div key={label}>
                    <div className="mb-1.5 flex items-baseline justify-between text-sm">
                      <span className="font-mono text-lg font-bold tabular-nums">
                        {duel.driver}
                      </span>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {label}
                      </span>
                      <span className="font-mono text-lg font-bold tabular-nums text-muted-foreground">
                        {duel.teammate}
                      </span>
                    </div>
                    {/* Two segments with a surface gap, so the split reads at a glance. */}
                    <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
                      <div
                        className="rounded-l-full"
                        style={{ width: `${share}%`, backgroundColor: accentColor }}
                      />
                      <div
                        className="flex-1 rounded-r-full bg-muted"
                        style={{ minWidth: total > 0 ? undefined : '50%' }}
                      />
                    </div>
                    {total === 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Sin duelos comparables esta temporada.
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Temporadas */}
        {stats.seasons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Por temporada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <caption className="sr-only">Resumen por temporada: equipo, posición final, victorias y puntos</caption>
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th scope="col" className="pb-2 pr-3 font-medium">Año</th>
                      <th scope="col" className="pb-2 pr-3 font-medium">Equipo</th>
                      <th scope="col" className="pb-2 pr-3 text-right font-medium">Pos</th>
                      <th scope="col" className="pb-2 pr-3 text-right font-medium">Vict</th>
                      <th scope="col" className="pb-2 text-right font-medium">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.seasons.map((season) => (
                      <tr key={season.year}>
                        <td className="py-2 pr-3 font-mono tabular-nums">{season.year}</td>
                        <td className="py-2 pr-3">
                          <span className="flex items-center gap-2">
                            <span
                              aria-hidden
                              className="inline-block h-3 w-1 shrink-0 rounded-sm"
                              style={{ backgroundColor: teamColor(season.constructorId).color }}
                            />
                            <span className="truncate">{season.team}</span>
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">
                          {season.position ?? '—'}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">
                          {season.wins}
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums">
                          {Math.round(season.points * 10) / 10}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

/** El mismo esqueleto que la sección real: seis tiles y dos tarjetas. */
function PerformanceSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-8 w-14 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="mb-10 h-5 w-80 animate-pulse rounded bg-muted" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-56 animate-pulse rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}

export default async function DriverDetailPage({ params }: DriverDetailPageProps) {
  const { driverId } = await params;

  let driver;
  let hasError = false;

  try {
    driver = await prisma.driver.findUnique({
      where: { driverId },
      include: {
        results: {
          take: 10,
          orderBy: { race: { date: 'desc' } },
          include: {
            race: { include: { circuit: true } },
            team: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching driver:', error);
    hasError = true;
  }

  if (!driver && !hasError) notFound();

  if (hasError || !driver) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Link href="/drivers" className="mb-8 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a pilotos
          </Button>
        </Link>
        <div className="mt-12 rounded-xl border border-border bg-card p-12 text-center">
          <h2 className="mb-3 text-2xl font-bold">Base de datos no disponible</h2>
          <p className="text-muted-foreground">
            No se pudo cargar la ficha del piloto. Inténtalo de nuevo en un momento.
          </p>
        </div>
      </div>
    );
  }

  const age = driverAge(driver.dateOfBirth);
  const bornOn = formatBirthDate(driver.dateOfBirth);

  // El equipo actual sale del resultado más reciente, que ya viene en la
  // consulta de arriba. Antes se sacaba de las estadísticas, y por ese dato la
  // cabecera entera —foto, nombre, dorsal— esperaba a cinco consultas más.
  const currentTeam = driver.results[0]?.team ?? null;
  const accent = teamColor(currentTeam?.constructorId);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Link href="/drivers" className="mb-6 inline-block">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a pilotos
        </Button>
      </Link>

      {/* Cabecera */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div
          className="h-48 w-48 shrink-0 self-center overflow-hidden rounded-full border-4 sm:self-auto"
          style={{ borderColor: accent.color }}
        >
          <DriverAvatar
            src={driver.imageUrl}
            name={`${driver.givenName} ${driver.familyName}`}
            size="xl"
          />
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
              {driver.givenName} {driver.familyName}
            </h1>
            {driver.permanentNumber && (
              <span className="font-mono text-3xl font-bold tabular-nums text-muted-foreground md:text-4xl">
                #{driver.permanentNumber}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <CountryFlag nationality={driver.nationality} size={18} />
              {driver.nationality}
            </span>
            {currentTeam && (
              <Link
                href={`/constructors/${currentTeam.constructorId}`}
                className="inline-flex items-center gap-2 hover:text-foreground"
              >
                <span
                  aria-hidden
                  className="inline-block h-3.5 w-1 rounded-sm"
                  style={{ backgroundColor: accent.color }}
                />
                {currentTeam.name}
              </Link>
            )}
            {age !== null && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" aria-hidden />
                {bornOn ? `${bornOn} · ${age} años` : `${age} años`}
              </span>
            )}
            {driver.code && (
              <span className="inline-flex items-center gap-1.5">
                <Hash className="h-4 w-4" aria-hidden />
                {driver.code}
              </span>
            )}
          </div>
        </div>
      </div>

      <Suspense fallback={<PerformanceSkeleton />}>
        <DriverPerformance driverId={driver.id} accentColor={accent.color} />
      </Suspense>

      {/* Últimos resultados */}
      {driver.results.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl font-semibold">Últimos resultados</h2>
          <div className="flex flex-col gap-2">
            {driver.results.map((result) => (
              <TimingRow
                key={result.id}
                position={result.position}
                constructorId={result.team.constructorId}
                href={`/results/${result.race.year}/${result.race.round}`}
                value={result.points}
                valueLabel="pts"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{result.race.raceName}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {result.race.year} · {result.race.circuit.name}
                  </span>
                </span>
              </TimingRow>
            ))}
          </div>
        </section>
      )}

      {driver.url && (
        <div className="mt-10 text-center">
          <a
            href={driver.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Ver más información en Wikipedia →
          </a>
        </div>
      )}
    </div>
  );
}
