import { Trophy, Medal, Award } from 'lucide-react';
import { SeasonSelector } from '@/components/ui/SeasonSelector';

export const metadata = {
  title: 'Standings F1 | ApexData',
  description: 'Clasificación del campeonato de pilotos y constructores de F1',
};

interface StandingsPageProps {
  searchParams: Promise<{ season?: string }>;
}

export default async function StandingsPage({ searchParams }: StandingsPageProps) {
  const params = await searchParams;
  const displayYear = params.season ? parseInt(params.season) : new Date().getFullYear();

  // Datos de ejemplo para mostrar la estructura
  // TODO: Integrar con API de Jolpica para obtener standings reales
  const driversStandings = [
    { position: 1, driver: 'Max Verstappen', points: 575, team: 'Red Bull Racing' },
    { position: 2, driver: 'Sergio Pérez', points: 285, team: 'Red Bull Racing' },
    { position: 3, driver: 'Lewis Hamilton', points: 234, team: 'Mercedes' },
    { position: 4, driver: 'Fernando Alonso', points: 206, team: 'Aston Martin' },
    { position: 5, driver: 'Carlos Sainz', points: 200, team: 'Ferrari' },
  ];

  const constructorsStandings = [
    { position: 1, team: 'Red Bull Racing', points: 860 },
    { position: 2, team: 'Mercedes', points: 409 },
    { position: 3, driver: 'Ferrari', points: 406 },
    { position: 4, team: 'Aston Martin', points: 280 },
    { position: 5, team: 'McLaren', points: 302 },
  ];

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
        </p>
      </div>

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
                <div
                  key={entry.position}
                  className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                    entry.position <= 3
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary'
                  }`}
                >
                  {/* Position */}
                  <div className="flex w-12 items-center justify-center">
                    {medalIcon ? (
                      <span className="text-2xl">{medalIcon}</span>
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground">
                        {entry.position}
                      </span>
                    )}
                  </div>

                  {/* Driver info */}
                  <div className="flex-1">
                    <div className="font-bold">{entry.driver}</div>
                    <div className="text-sm text-muted-foreground">{entry.team}</div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{entry.points}</div>
                    <div className="text-xs text-muted-foreground">pts</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-center">
            <button className="text-sm text-primary hover:underline">
              Ver clasificación completa →
            </button>
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
                <div
                  key={entry.position}
                  className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                    entry.position <= 3
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary'
                  }`}
                >
                  {/* Position */}
                  <div className="flex w-12 items-center justify-center">
                    {medalIcon ? (
                      <span className="text-2xl">{medalIcon}</span>
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground">
                        {entry.position}
                      </span>
                    )}
                  </div>

                  {/* Team name */}
                  <div className="flex-1 font-bold">{entry.team}</div>

                  {/* Points */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{entry.points}</div>
                    <div className="text-xs text-muted-foreground">pts</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-center">
            <button className="text-sm text-primary hover:underline">
              Ver clasificación completa →
            </button>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-12 rounded-lg border border-border bg-muted/50 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          <strong>Nota:</strong> Los datos mostrados son de ejemplo. La integración con la API de standings en tiempo real está pendiente.
        </p>
      </div>
    </div>
  );
}
