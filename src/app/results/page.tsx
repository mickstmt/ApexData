import { prisma } from '@/lib/prisma';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { SeasonSelector } from '@/components/ui/SeasonSelector';
import { SeasonResultRows } from './SeasonResultRows';
import { temporadaPorDefecto } from '@/lib/temporada';
import { fechaDeCarreraCorta } from '@/lib/fechas';

export const metadata = {
  title: 'Resultados | ApexData',
  description: 'Todos los resultados de carreras de Fórmula 1',
};

interface ResultsPageProps {
  searchParams: Promise<{ season?: string }>;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = await searchParams;
  const displayYear = params.season ? parseInt(params.season) : await temporadaPorDefecto();

  // Obtener todas las carreras del año seleccionado con sus resultados
  const races = await prisma.race.findMany({
    where: {
      year: displayYear,
    },
    include: {
      circuit: true,
      results: {
        include: {
          driver: true,
          team: true,
        },
        orderBy: {
          positionOrder: 'asc',
        },
        take: 3, // Solo top 3 para la vista compacta
      },
    },
    orderBy: {
      round: 'asc',
    },
  });

  // Filtrar solo carreras que tengan resultados
  const racesWithResults = races.filter((race) => race.results.length > 0);

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold md:text-5xl">
              Resultados <span className="text-primary">{displayYear}</span>
            </h1>
          </div>
          <SeasonSelector currentSeason={displayYear} />
        </div>
        <p className="text-lg text-muted-foreground">
          Resultados de las carreras de la temporada {displayYear}
        </p>
      </div>

      {/* Results Table */}
      {racesWithResults.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <SeasonResultRows
            rows={racesWithResults.flatMap((race) => {
              const winner = race.results[0];
              if (!winner) return [];

              return [
                {
                  id: race.id,
                  round: race.round,
                  year: displayYear,
                  raceName: race.raceName,
                  country: race.circuit.country,
                  flag: getFlagEmoji(race.circuit.country),
                  fecha: fechaDeCarreraCorta(race.date),
                  winnerName: `${winner.driver.givenName} ${winner.driver.familyName}`,
                  winnerId: winner.driver.driverId,
                  winnerCode:
                    winner.driver.code || winner.driver.familyName.slice(0, 3).toUpperCase(),
                  teamName: winner.team.name,
                  teamId: winner.team.constructorId,
                  laps: winner.laps,
                  time: winner.time || winner.status,
                },
              ];
            })}
          />

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
                <caption className="sr-only">Resultados de cada gran premio de la temporada</caption>
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th scope="col" className="p-4 text-left text-sm font-semibold text-foreground">
                    GRAN PREMIO
                  </th>
                  <th scope="col" className="p-4 text-left text-sm font-semibold text-foreground">
                    FECHA
                  </th>
                  <th scope="col" className="p-4 text-left text-sm font-semibold text-foreground">
                    GANADOR
                  </th>
                  <th scope="col" className="p-4 text-left text-sm font-semibold text-foreground">
                    EQUIPO
                  </th>
                  <th scope="col" className="p-4 text-right text-sm font-semibold text-foreground">
                    VUELTAS
                  </th>
                  <th scope="col" className="p-4 text-right text-sm font-semibold text-foreground">
                    TIEMPO
                  </th>
                </tr>
              </thead>
              <tbody>
                {racesWithResults.map((race) => {
                  const winner = race.results[0];
                  if (!winner) return null;

                  const flagEmoji = getFlagEmoji(race.circuit.country);

                  return (
                    <tr
                      key={race.id}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <td className="p-4">
                        <Link
                          href={`/results/${displayYear}/${race.round}`}
                          className="flex items-center gap-3 hover:text-primary transition-colors"
                        >
                          <span className="text-2xl">{flagEmoji}</span>
                          <div>
                            <div className="font-semibold">{race.circuit.country}</div>
                            <div className="text-sm text-muted-foreground">
                              {race.raceName}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {fechaDeCarreraCorta(race.date)}
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/drivers/${winner.driver.driverId}`}
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-podium-gold/20 text-sm font-bold text-podium-gold">
                            {winner.driver.code || winner.driver.familyName.slice(0, 3).toUpperCase()}
                          </div>
                          <span className="font-medium">
                            {winner.driver.givenName} {winner.driver.familyName}
                          </span>
                        </Link>
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/constructors/${winner.team.constructorId}`}
                          className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/20">
                            <span className="text-xs font-bold text-primary">
                              {getTeamAbbr(winner.team.name)}
                            </span>
                          </div>
                          <span className="text-muted-foreground">
                            {winner.team.name}
                          </span>
                        </Link>
                      </td>
                      <td className="p-4 text-right text-sm text-muted-foreground">
                        {winner.laps}
                      </td>
                      <td className="p-4 text-right text-sm font-mono">
                        {winner.time || (
                          <span className="text-muted-foreground">{winner.status}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No hay resultados disponibles</h3>
          <p className="text-sm text-muted-foreground">
            Los resultados de la temporada {displayYear} aún no están disponibles en nuestra base
            de datos.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to get flag emoji from country name
function getFlagEmoji(country: string): string {
  const flagMap: Record<string, string> = {
    Bahrain: '🇧🇭',
    'Saudi Arabia': '🇸🇦',
    Australia: '🇦🇺',
    Japan: '🇯🇵',
    China: '🇨🇳',
    USA: '🇺🇸',
    Italy: '🇮🇹',
    Monaco: '🇲🇨',
    Canada: '🇨🇦',
    Spain: '🇪🇸',
    Austria: '🇦🇹',
    UK: '🇬🇧',
    Hungary: '🇭🇺',
    Belgium: '🇧🇪',
    Netherlands: '🇳🇱',
    Azerbaijan: '🇦🇿',
    Singapore: '🇸🇬',
    Mexico: '🇲🇽',
    Brazil: '🇧🇷',
    Qatar: '🇶🇦',
    UAE: '🇦🇪',
    Unknown: '🏁',
  };
  return flagMap[country] || '🏁';
}

// Helper function to get team abbreviation
function getTeamAbbr(teamName: string): string {
  const abbrMap: Record<string, string> = {
    'Red Bull': 'RB',
    Ferrari: 'FER',
    Mercedes: 'MER',
    McLaren: 'MCL',
    'Aston Martin': 'AM',
    Alpine: 'ALP',
    Williams: 'WIL',
    'Alfa Romeo': 'AR',
    'AlphaTauri': 'AT',
    'Haas F1 Team': 'HAS',
    'RB F1 Team': 'RB',
    'Kick Sauber': 'KS',
  };

  for (const [key, abbr] of Object.entries(abbrMap)) {
    if (teamName.includes(key)) {
      return abbr;
    }
  }

  // Fallback: first 3 letters
  return teamName.slice(0, 3).toUpperCase();
}
