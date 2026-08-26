import { TrazadoAmpliable } from '@/components/home/TrazadoAmpliable';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Flag } from 'lucide-react';
import { unstable_cache } from 'next/cache';
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
import { SesionesDelFinDeSemana } from '@/components/home/SesionesDelFinDeSemana';

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
/**
 * Lo que la portada necesita de la base, cacheado.
 *
 * ## Por qué hacía falta
 *
 * Era la única página con datos que no cacheaba nada. Medido en producción:
 * **584 ms hasta el primer byte, frente a 65 ms** en clasificación o
 * resultados. No es culpa de las consultas ni de un índice que falte —los hay
 * en `Race.date` y `Result.raceId`—: es que el VPS está a unos 101 ms de red de
 * Supabase, y `include` hace un viaje por relación. Cinco o seis viajes son
 * medio segundo antes de mandar un solo byte.
 *
 * El patrón ya estaba en el proyecto —`force-dynamic` en la página más
 * `unstable_cache` en la consulta, como en `/circuits`—; a la portada le
 * faltaba la segunda mitad.
 *
 * ## Por qué `select` y no `include`
 *
 * La misma trampa que costó una tarde en la ficha de piloto: la caché de Next
 * guarda serializando a JSON y `Result.milliseconds` es un `BigInt`, que
 * `JSON.stringify` no sabe convertir. Con `include` esto **no se cachearía en
 * absoluto** y el fallo moriría como rechazo no capturado, sin romper la
 * página y sin verse. Enumerar los campos deja fuera el `BigInt` y de paso no
 * trae columnas que la portada no pinta.
 *
 * ## Por qué cinco minutos
 *
 * Lo que se cachea es **qué** carrera es la próxima y cuál la última, no cuánto
 * falta: la cuenta atrás vive en el navegador y sigue al segundo. Esas dos
 * identidades cambian como mucho una vez por fin de semana, así que cinco
 * minutos es holgado para el peor momento —el rato justo después de una
 * carrera, cuando la última debe cambiar— y suficiente para que casi ninguna
 * visita pague el viaje a la base.
 */
const getHubDataCacheada = unstable_cache(
  async () => {
    const now = new Date();
    // Race.date is midnight UTC and the start time lives in Race.time, so the
    // window is widened by a day and the exact start is resolved in code.
    const yesterday = new Date(now.getTime() - 86_400_000);

    const circuito = {
      select: { name: true, location: true, country: true, imageUrl: true },
    } as const;

    const [upcoming, lastRace] = await Promise.all([
      prisma.race.findMany({
        where: { date: { gte: yesterday } },
        orderBy: { date: 'asc' },
        take: 3,
        select: {
          id: true,
          year: true,
          round: true,
          raceName: true,
          date: true,
          time: true,
          fp1Date: true,
          fp2Date: true,
          fp3Date: true,
          qualiDate: true,
          sprintDate: true,
          sprintQualiDate: true,
          circuit: circuito,
        },
      }),
      prisma.race.findFirst({
        where: { date: { lte: now }, results: { some: {} } },
        orderBy: { date: 'desc' },
        select: {
          year: true,
          round: true,
          raceName: true,
          circuit: circuito,
          results: {
            where: { position: { lte: 3 } },
            orderBy: { position: 'asc' },
            select: {
              id: true,
              position: true,
              points: true,
              driver: {
                select: { driverId: true, givenName: true, familyName: true, imageUrl: true },
              },
              team: { select: { constructorId: true, name: true } },
            },
          },
        },
      }),
    ]);

    return { upcoming, lastRace };
  },
  ['portada-carreras'],
  { revalidate: 300, tags: ['portada'] }
);

/** Los campos de `Race` que son fechas y que la portada usa como tales. */
const FECHAS = [
  'date',
  'fp1Date',
  'fp2Date',
  'fp3Date',
  'qualiDate',
  'sprintDate',
  'sprintQualiDate',
] as const;

/**
 * Devuelve las fechas a ser fechas al salir de la caché.
 *
 * `unstable_cache` guarda serializando a JSON, así que un `Date` vuelve como
 * cadena. Sin esto, `raceStart` reventaba con «date.toISOString is not a
 * function», la portada caía en su pantalla de «no se pudo conectar» y —lo
 * peor— **seguía respondiendo 200 en 14 ms**: el atajo de medir solo el tiempo
 * daba por bueno un error.
 */
function conFechasDeVerdad<T extends Record<string, unknown>>(fila: T): T {
  const copia = { ...fila } as Record<string, unknown>;
  for (const campo of FECHAS) {
    const valor = copia[campo];
    if (typeof valor === 'string') copia[campo] = new Date(valor);
  }
  return copia as T;
}

async function getHubData() {
  const now = new Date();

  try {
    const cacheada = await getHubDataCacheada();
    const upcoming = cacheada.upcoming.map(conFechasDeVerdad);
    const lastRace = cacheada.lastRace;

    // Se resuelve fuera de la caché: depende de la hora actual, y meterlo
    // dentro congelaría durante cinco minutos cuál es la próxima carrera justo
    // en el momento en que deja de serlo.
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
                  {/* A noventa píxeles se reconoce el circuito pero no se
                      distingue una curva de otra. Tocarlo lo abre entero. */}
                  <TrazadoAmpliable
                    src={nextRace.circuit.imageUrl}
                    circuito={nextRace.circuit.name}
                  />
                </div>
              )}
            </div>

            {nextSessions.length > 1 && (
              <div className="border-t border-border">
                <SesionesDelFinDeSemana
                  year={nextRace.year}
                  round={nextRace.round}
                  sesiones={nextSessions.map(({ nombre, cuando }) => ({
                    nombre,
                    cuando: cuando.toISOString(),
                  }))}
                />
              </div>
            )}
          </Card>
        </section>
      )}

      {/* `min-w-0` en los hijos: por defecto una celda de rejilla no encoge por
          debajo del ancho de su contenido, así que las dos tarjetas exigían 372
          y 380 px dentro de una columna de 358 y empujaban la página 6 px más
          allá de la pantalla. Se veía como un «Ver todo» pegado al borde y una
          barra de desplazamiento horizontal que nadie había pedido. */}
      <div className="grid gap-8 lg:grid-cols-2 [&>*]:min-w-0">
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
