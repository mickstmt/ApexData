import { prisma } from '@/lib/prisma';
import { Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';

export const metadata = {
  title: 'Calendario F1 2025 | ApexData',
  description: 'Calendario completo de la temporada 2025 de Fórmula 1',
};

export default async function CalendarPage() {
  // Obtener todas las carreras de 2025 ordenadas por fecha
  const races = await prisma.race.findMany({
    where: {
      season: {
        year: 2025,
      },
    },
    include: {
      circuit: true,
      season: true,
    },
    orderBy: {
      round: 'asc',
    },
  });

  const today = new Date();

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold md:text-5xl">
            Calendario <span className="text-primary">2025</span>
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          {races.length} grandes premios programados para la temporada
        </p>
      </div>

      {/* Races List */}
      {races.length > 0 ? (
        <div className="space-y-4">
          {races.map((race) => {
            const raceDate = new Date(race.date);
            const isPast = raceDate < today;
            const isToday = raceDate.toDateString() === today.toDateString();

            return (
              <div
                key={race.id}
                className={`rounded-lg border p-6 transition-all ${
                  isToday
                    ? 'border-primary bg-primary/5'
                    : isPast
                    ? 'border-border bg-muted/30 opacity-75'
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
                      <h3 className="text-xl font-bold">{race.name}</h3>
                      {isToday && (
                        <span className="rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                          HOY
                        </span>
                      )}
                      {isPast && !isToday && (
                        <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
                          FINALIZADO
                        </span>
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
                          {raceDate.toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {race.url && (
                      <a
                        href={race.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-primary hover:underline"
                      >
                        Más información →
                      </a>
                    )}
                  </div>

                  {/* Country/Flag placeholder */}
                  <div className="flex items-center justify-end">
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
            <div className="text-3xl font-bold text-primary">
              {races.length}
            </div>
            <div className="text-sm text-muted-foreground">Grandes Premios</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">
              {races.filter((r) => new Date(r.date) < today).length}
            </div>
            <div className="text-sm text-muted-foreground">Finalizados</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">
              {races.filter((r) => new Date(r.date) >= today).length}
            </div>
            <div className="text-sm text-muted-foreground">Próximos</div>
          </div>
        </div>
      )}
    </div>
  );
}
