import { Trophy, Medal, Award } from 'lucide-react';
import { SeasonSelector } from '@/components/ui/SeasonSelector';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const metadata = {
  title: 'Standings F1 | ApexData',
  description: 'Clasificación del campeonato de pilotos y constructores de F1',
};

interface StandingsPageProps {
  searchParams: Promise<{ season?: string }>;
}

interface DriverStanding {
  position: number;
  driver: string;
  points: number;
  team: string;
  wins: number;
}

interface ConstructorStanding {
  position: number;
  team: string;
  points: number;
  wins: number;
}

async function getDriverStandings(year: number): Promise<DriverStanding[]> {
  try {
    // Get all results for the specified year
    const results = await prisma.result.findMany({
      where: {
        race: {
          year: year,
        },
      },
      include: {
        driver: true,
        constructor: true,
        race: true,
      },
    });

    // Group results by driver and calculate total points
    const driverMap = new Map<string, {
      driverId: string;
      givenName: string;
      familyName: string;
      team: string;
      points: number;
      wins: number;
      bestFinish: number;
    }>();

    for (const result of results) {
      const key = result.driver.id;
      const existing = driverMap.get(key);

      const wins = result.position === 1 ? 1 : 0;
      const bestFinish = result.position || 999;

      if (existing) {
        existing.points += result.points;
        existing.wins += wins;
        existing.bestFinish = Math.min(existing.bestFinish, bestFinish);
      } else {
        driverMap.set(key, {
          driverId: result.driver.id,
          givenName: result.driver.givenName,
          familyName: result.driver.familyName,
          team: result.constructor.name,
          points: result.points,
          wins: wins,
          bestFinish: bestFinish,
        });
      }
    }

    // Convert to array and sort by points (desc), then by wins (desc), then by best finish (asc)
    const standings = Array.from(driverMap.values())
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.bestFinish - b.bestFinish;
      })
      .map((driver, index) => ({
        position: index + 1,
        driver: `${driver.givenName} ${driver.familyName}`,
        points: driver.points,
        team: driver.team,
        wins: driver.wins,
      }));

    return standings;
  } catch (error) {
    console.error('Error fetching driver standings:', error);
    return [];
  }
}

async function getConstructorStandings(year: number): Promise<ConstructorStanding[]> {
  try {
    // Get all results for the specified year
    const results = await prisma.result.findMany({
      where: {
        race: {
          year: year,
        },
      },
      include: {
        constructor: true,
        race: true,
      },
    });

    // Group results by constructor and calculate total points
    const constructorMap = new Map<string, {
      constructorId: string;
      name: string;
      points: number;
      wins: number;
      bestFinish: number;
    }>();

    for (const result of results) {
      const key = result.constructor.id;
      const existing = constructorMap.get(key);

      const wins = result.position === 1 ? 1 : 0;
      const bestFinish = result.position || 999;

      if (existing) {
        existing.points += result.points;
        existing.wins += wins;
        existing.bestFinish = Math.min(existing.bestFinish, bestFinish);
      } else {
        constructorMap.set(key, {
          constructorId: result.constructor.id,
          name: result.constructor.name,
          points: result.points,
          wins: wins,
          bestFinish: bestFinish,
        });
      }
    }

    // Convert to array and sort by points (desc), then by wins (desc), then by best finish (asc)
    const standings = Array.from(constructorMap.values())
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.bestFinish - b.bestFinish;
      })
      .map((constructor, index) => ({
        position: index + 1,
        team: constructor.name,
        points: constructor.points,
        wins: constructor.wins,
      }));

    return standings;
  } catch (error) {
    console.error('Error fetching constructor standings:', error);
    return [];
  }
}

export default async function StandingsPage({ searchParams }: StandingsPageProps) {
  const params = await searchParams;
  const displayYear = params.season ? parseInt(params.season) : new Date().getFullYear();

  // Fetch real standings from database
  const driversStandings = await getDriverStandings(displayYear);
  const constructorsStandings = await getConstructorStandings(displayYear);

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

      {driversStandings.length === 0 && constructorsStandings.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <p className="text-lg text-muted-foreground">
            No hay datos de clasificación disponibles para la temporada {displayYear}.
          </p>
        </div>
      ) : (
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
                      <div className="font-display text-2xl font-bold text-primary">{entry.points}</div>
                      <div className="text-xs text-muted-foreground">pts</div>
                    </div>
                  </div>
                );
              })}
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
                      <div className="font-display text-2xl font-bold text-primary">{entry.points}</div>
                      <div className="text-xs text-muted-foreground">pts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
