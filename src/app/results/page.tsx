import { prisma } from '@/lib/prisma';
import { Trophy, User, Users, Clock } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Resultados 2024 | ApexData',
  description: 'Todos los resultados de carreras de la temporada 2024 de Fórmula 1',
};

export default async function ResultsPage() {
  // Obtener todas las carreras de 2024 con sus resultados
  const races = await prisma.race.findMany({
    where: {
      year: 2024,
    },
    include: {
      circuit: true,
      results: {
        include: {
          driver: true,
          constructor: true,
        },
        orderBy: {
          positionOrder: 'asc',
        },
      },
    },
    orderBy: {
      round: 'asc',
    },
  });

  const totalRaces = races.length;
  const totalResults = races.reduce((acc, race) => acc + race.results.length, 0);

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold md:text-5xl">
            Resultados <span className="text-primary">2024</span>
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Todos los resultados de las {totalRaces} carreras disputadas en la temporada 2024
        </p>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4" />
              Carreras
            </div>
            <div className="mt-2 text-2xl font-bold">{totalRaces}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              Resultados
            </div>
            <div className="mt-2 text-2xl font-bold">{totalResults}</div>
          </div>
        </div>
      </div>

      {/* Results by Race */}
      <div className="space-y-8">
        {races.map((race) => (
          <div key={race.id} className="rounded-lg border border-border bg-card">
            {/* Race Header */}
            <div className="border-b border-border bg-muted/50 p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-primary">
                    Round {race.round}
                  </div>
                  <h2 className="text-2xl font-bold">{race.raceName}</h2>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{race.circuit.name}</span>
                    <span>•</span>
                    <span>{new Date(race.date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-muted-foreground">
                    <th className="p-4 font-semibold">Pos</th>
                    <th className="p-4 font-semibold">Piloto</th>
                    <th className="p-4 font-semibold">Equipo</th>
                    <th className="p-4 font-semibold">Grid</th>
                    <th className="p-4 font-semibold">Vueltas</th>
                    <th className="p-4 font-semibold">Tiempo</th>
                    <th className="p-4 font-semibold">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {race.results.map((result, index) => {
                    const isPodium = result.position && result.position <= 3;
                    const isWinner = result.position === 1;

                    return (
                      <tr
                        key={result.id}
                        className={`border-b border-border transition-colors hover:bg-muted/50 ${
                          isPodium ? 'bg-primary/5' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                                isWinner
                                  ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                  : isPodium
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {result.positionText}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Link
                            href={`/drivers/${result.driver.driverId}`}
                            className="hover:text-primary transition-colors"
                          >
                            <div className="font-semibold">
                              {result.driver.givenName} {result.driver.familyName}
                            </div>
                            {result.driver.code && (
                              <div className="text-xs text-muted-foreground">
                                {result.driver.code}
                              </div>
                            )}
                          </Link>
                        </td>
                        <td className="p-4">
                          <Link
                            href={`/constructors/${result.constructor.constructorId}`}
                            className="text-sm hover:text-primary transition-colors"
                          >
                            {result.constructor.name}
                          </Link>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {result.grid}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {result.laps}
                        </td>
                        <td className="p-4 text-sm">
                          {result.time || (
                            <span className="text-muted-foreground">
                              {result.status}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`font-semibold ${
                              result.points > 0
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {result.points}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {races.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No hay resultados disponibles</h3>
          <p className="text-sm text-muted-foreground">
            Los resultados de la temporada 2024 aún no están disponibles.
          </p>
        </div>
      )}
    </div>
  );
}
