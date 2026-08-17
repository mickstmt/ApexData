import Link from 'next/link';
import { Trophy, Medal, Award } from 'lucide-react';
import { DriverAvatar, TeamLogo } from '@/components/ui/OptimizedImage';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { SeasonSelector } from '@/components/ui/SeasonSelector';
import { prisma } from '@/lib/prisma';

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

/**
 * Standings come straight from the stored championship tables, which Jolpica
 * publishes after every round. The page used to load a whole season of results
 * and add them up in memory, which also got the countback tie-breaks wrong.
 */
async function getStandings(year: number) {
  try {
    // Each table is written independently, so take the newest round present
    // in either one rather than assuming they advanced together.
    const [latestDriverRound, latestConstructorRound] = await Promise.all([
      prisma.driverStanding.findFirst({ where: { year }, orderBy: { round: 'desc' }, select: { round: true } }),
      // `team: false` keeps this literal from inheriting
      // Object.prototype.constructor, which Prisma rejects as a select key.
      prisma.constructorStanding.findFirst({
        where: { year },
        orderBy: { round: 'desc' },
        select: { round: true, team: false },
      }),
    ]);

    const round = Math.max(latestDriverRound?.round ?? 0, latestConstructorRound?.round ?? 0);

    if (round === 0) return { drivers: [], constructors: [], round: 0 };

    const [driverRows, constructorRows] = await Promise.all([
      prisma.driverStanding.findMany({
        where: { year, round },
        orderBy: [{ position: 'asc' }],
        include: { driver: true },
      }),
      prisma.constructorStanding.findMany({
        where: { year, round },
        orderBy: [{ position: 'asc' }],
        include: { team: true },
      }),
    ]);

    // A driver's team is not part of the standings table, so it is read from
    // that season's most recent race entry.
    const teamByDriver = new Map<string, string>();
    // Walk back from the latest round until every driver has a team, instead of
    // pulling the whole season into memory.
    for (let lookup = round; lookup >= 1 && teamByDriver.size < driverRows.length; lookup--) {
      const entries = await prisma.result.findMany({
        where: { race: { year, round: lookup } },
        include: { team: true },
      });

      for (const entry of entries) {
        if (!teamByDriver.has(entry.driverId)) {
          teamByDriver.set(entry.driverId, entry.team.name);
        }
      }
    }

    return {
      round,
      drivers: driverRows.map((row) => ({
        position: row.position,
        driver: `${row.driver.givenName} ${row.driver.familyName}`,
        driverId: row.driver.driverId,
        nationality: row.driver.nationality,
        imageUrl: row.driver.imageUrl,
        team: teamByDriver.get(row.driverId) ?? '—',
        points: row.points,
        wins: row.wins,
      })),
      constructors: constructorRows.map((row) => ({
        position: row.position,
        team: row.team.name,
        constructorId: row.team.constructorId,
        logoUrl: row.team.logoUrl,
        points: row.points,
        wins: row.wins,
      })),
    };
  } catch (error) {
    console.error('Error fetching standings:', error);
    return { drivers: [], constructors: [], round: 0 };
  }
}

export default async function StandingsPage({ searchParams }: StandingsPageProps) {
  const params = await searchParams;
  const displayYear = params.season ? parseInt(params.season) : new Date().getFullYear();

  const { drivers: driversStandings, constructors: constructorsStandings, round } =
    await getStandings(displayYear);

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
          {round > 0 && ` · tras la ronda ${round}`}
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
                  <Link
                    key={entry.driverId}
                    href={`/drivers/${entry.driverId}`}
                    className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                      entry.position !== null && entry.position <= 3
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary'
                    }`}
                  >
                    {/* Position */}
                    <div className="flex w-12 items-center justify-center">
                      {medalIcon ? (
                        <span className="text-2xl">{medalIcon}</span>
                      ) : (
                        <span className="text-xl font-bold tabular-nums text-muted-foreground">
                          {entry.position ?? '—'}
                        </span>
                      )}
                    </div>

                    <DriverAvatar src={entry.imageUrl} name={entry.driver} size="sm" />

                    {/* Driver info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-bold">
                        <CountryFlag nationality={entry.nationality} size={16} />
                        {entry.driver}
                      </div>
                      <div className="text-sm text-muted-foreground">{entry.team}</div>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <div className="font-display text-2xl font-bold tabular-nums text-primary">{entry.points}</div>
                      <div className="text-xs text-muted-foreground">pts</div>
                    </div>
                  </Link>
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
                  <Link
                    key={entry.constructorId}
                    href={`/constructors/${entry.constructorId}`}
                    className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                      entry.position !== null && entry.position <= 3
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary'
                    }`}
                  >
                    {/* Position */}
                    <div className="flex w-12 items-center justify-center">
                      {medalIcon ? (
                        <span className="text-2xl">{medalIcon}</span>
                      ) : (
                        <span className="text-xl font-bold tabular-nums text-muted-foreground">
                          {entry.position ?? '—'}
                        </span>
                      )}
                    </div>

                    <TeamLogo src={entry.logoUrl} name={entry.team} size="sm" />

                    {/* Team name */}
                    <div className="flex-1 font-bold">{entry.team}</div>

                    {/* Points */}
                    <div className="text-right">
                      <div className="font-display text-2xl font-bold tabular-nums text-primary">{entry.points}</div>
                      <div className="text-xs text-muted-foreground">pts</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
