import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';
import { fallbackRaces } from '@/lib/fallback-data';
import { SeasonSelector } from '@/components/ui/SeasonSelector';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { Chip } from '@/components/ui/Chip';
import { IrALaProximaCarrera } from './IrALaProximaCarrera';
import { fechaDeCarrera } from '@/lib/fechas';

export const metadata = {
  title: 'Calendario F1 | ApexData',
  description: 'Calendario completo de temporadas de Fórmula 1',
};

interface CalendarPageProps {
  searchParams: Promise<{ season?: string }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;
  const requestedYear = params.season ? parseInt(params.season) : new Date().getFullYear();

  let races;
  let displayYear = requestedYear;
  let isCurrentSeason = requestedYear === new Date().getFullYear();
  let usingFallback = false;

  try {
    races = await prisma.race.findMany({
      where: {
        year: displayYear,
      },
      select: {
        id: true,
        round: true,
        raceName: true,
        date: true,
        url: true,
        year: true,
        circuit: {
          select: {
            name: true,
            location: true,
            country: true,
          },
        },
      },
      orderBy: {
        round: 'asc',
      },
    });

    // Si no hay carreras para el año solicitado, buscar la temporada más reciente
    if (races.length === 0) {
      const latestRace = await prisma.race.findFirst({
        orderBy: { year: 'desc' },
        select: { year: true },
      });

      if (latestRace) {
        const latestYear = latestRace.year;
        races = await prisma.race.findMany({
          where: { year: latestYear },
          select: {
            id: true,
            round: true,
            raceName: true,
            date: true,
            url: true,
            year: true,
            circuit: {
              select: {
                name: true,
                location: true,
                country: true,
              },
            },
          },
          orderBy: {
            round: 'asc',
          },
        });
        displayYear = latestYear;
        isCurrentSeason = false;
      } else {
        races = fallbackRaces;
        displayYear = 2024;
        isCurrentSeason = false;
        usingFallback = true;
      }
    }
  } catch (error) {
    console.error('Error fetching races:', error);
    races = fallbackRaces;
    displayYear = 2024;
    isCurrentSeason = false;
    usingFallback = true;
  }

  const today = new Date();

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold md:text-5xl">
              Calendario <span className="text-primary">{displayYear}</span>
            </h1>
          </div>
          <SeasonSelector currentSeason={displayYear} />
        </div>
        <p className="text-lg text-muted-foreground">
          {races.length} grandes premios programados para la temporada
        </p>
        {usingFallback && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              <strong>⚠️ Base de datos no disponible:</strong> Mostrando datos de ejemplo.
              Por favor, reactiva tu proyecto de Supabase en{' '}
              <a
                href="https://supabase.com/dashboard/projects"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-red-700"
              >
                el dashboard
              </a>.
            </p>
          </div>
        )}
        {!isCurrentSeason && !usingFallback && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Mostrando datos de la temporada {displayYear}. Los datos de 2025 aún no están disponibles.
            </p>
          </div>
        )}
      </div>

      {/* Races List */}
      {races.length > 0 ? (
        <div className="space-y-4">
          <IrALaProximaCarrera temporada={displayYear} />
          {races.map((race) => {
            const raceDate = new Date(race.date);
            const isPast = raceDate < today;
            const isToday = raceDate.toDateString() === today.toDateString();

            return (
              <div
                key={race.id}
                data-fecha={raceDate.toISOString()}
                // `relative`, para que el enlace del titulo pueda estirarse
                // sobre la tarjeta entera. Ver el comentario de mas abajo.
                className={`relative rounded-lg border p-6 transition-all ${
                  isToday
                    ? 'border-primary bg-primary/5'
                    : isPast
                    ? 'border-border bg-muted/30'
                    : 'border-border bg-card hover:border-primary hover:shadow-md'
                }`}
              >
                <div className="grid gap-4 md:grid-cols-[auto_1fr_auto]">
                  {/* Round number */}
                  <div className="flex items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
                      <span className="text-2xl font-bold text-primary">
                        {race.round}
                      </span>
                    </div>
                  </div>

                  {/* Race info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* El calendario lleva a la ficha de la carrera.
                          Teniendo los resultados guardados, mirar el calendario
                          y no poder ir a ellos era pedirle a la gente que
                          volviera a buscar el mismo Gran Premio en otra
                          pantalla.

                          Un solo enlace que se estira sobre la tarjeta entera:
                          asi el objetivo tactil es la tarjeta —no un renglon de
                          texto— sin anidar controles, que es el defecto que la
                          auditoria senalo. Mismo patron que la lista de
                          circuitos. El enlace a Wikipedia de mas abajo se queda
                          por encima con su propia capa.

                          Se enlazan TODAS, tambien las que no se han corrido:
                          desde el 2026-08-22 esa ficha cuenta cuanto falta y
                          ensena la parrilla provisional, asi que ya no lleva a
                          una pantalla vacia. */}
                      <h3 className="text-xl font-bold">
                        <Link
                          href={`/results/${displayYear}/${race.round}`}
                          className="after:absolute after:inset-0 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {race.raceName}
                        </Link>
                      </h3>
                      {isToday && (
                        <Chip tono="solido">HOY</Chip>
                      )}
                      {isPast && !isToday && (
                        <Chip tono="apagado">FINALIZADO</Chip>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {race.circuit.name}, {race.circuit.location}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {fechaDeCarrera(raceDate)}
                        </span>
                      </div>
                    </div>

                    {race.url && (
                      <a
                        href={race.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        // `relative z-10`: sin esto, el enlace estirado del
                        // titulo queda encima y pulsar aqui abriria la ficha en
                        // vez de Wikipedia.
                        className="relative z-10 inline-flex items-center text-sm text-primary hover:underline"
                      >
                        Más información →
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <CountryFlag country={race.circuit.country} size={24} />
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {race.circuit.country}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <CalendarIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">
            No hay carreras programadas para esta temporada
          </p>
        </div>
      )}

      {/* Stats */}
      {races.length > 0 && (
        <div className="mt-12 grid gap-4 rounded-lg border border-border bg-muted/50 p-6 md:grid-cols-3">
          <div className="text-center">
            <div className="font-display text-3xl font-bold text-primary">
              {races.length}
            </div>
            <div className="text-sm text-muted-foreground">Grandes Premios</div>
          </div>
          <div className="text-center">
            <div className="font-display text-3xl font-bold text-primary">
              {races.filter((r) => new Date(r.date) < today).length}
            </div>
            <div className="text-sm text-muted-foreground">Finalizados</div>
          </div>
          <div className="text-center">
            <div className="font-display text-3xl font-bold text-primary">
              {races.filter((r) => new Date(r.date) >= today).length}
            </div>
            <div className="text-sm text-muted-foreground">Próximos</div>
          </div>
        </div>
      )}
    </div>
  );
}
