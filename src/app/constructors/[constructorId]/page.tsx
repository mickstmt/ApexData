import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Flag, Trophy, Medal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamLogo } from '@/components/ui/OptimizedImage';
import { teamColor } from '@/lib/team-colors';

// Los datos de esta página cambian como mucho una vez por carrera, así que
// una hora de caché evita ir a Virginia en cada visita sin que nadie note
// nunca un dato viejo.
export const revalidate = 3600;

interface ConstructorDetailPageProps {
  params: Promise<{
    constructorId: string;
  }>;
}

export async function generateMetadata({ params }: ConstructorDetailPageProps) {
  const { constructorId } = await params;

  try {
    const constructor = await prisma.team.findUnique({
      where: { constructorId },
    });

    if (constructor) {
      return {
        title: `${constructor.name} | ApexData`,
        description: `Historial, pilotos y resultados de ${constructor.name} en la Fórmula 1`,
      };
    }
  } catch {
    // La base de datos no responde: el título genérico es suficiente.
  }

  return { title: 'Equipo no encontrado | ApexData' };
}

export default async function ConstructorDetailPage({ params }: ConstructorDetailPageProps) {
  const { constructorId } = await params;

  let constructor;
  let totals = { races: 0, wins: 0, podiums: 0, points: 0 };
  let drivers: { name: string; driverId: string }[] = [];
  let recentResults: {
    id: string;
    position: number | null;
    points: number;
    race: { raceName: string };
    driver: { givenName: string; familyName: string };
  }[] = [];
  let hasError = false;

  try {
    constructor = await prisma.team.findUnique({ where: { constructorId } });

    if (constructor) {
      // Antes esta página traía TODOS los resultados históricos del equipo con
      // su carrera, su circuito y su piloto anidados —Ferrari son más de mil
      // filas— para acabar mostrando tres contadores y diez filas. Ahora cada
      // cosa se pide como lo que es: los contadores se cuentan y se suman en
      // la base de datos, y las filas se piden con `take`. Van en paralelo, así
      // que son un viaje de ida y vuelta, no cinco.
      const teamId = constructor.id;

      const [races, wins, podiums, sum, recent, seen] = await Promise.all([
        prisma.result.count({ where: { constructorId: teamId } }),
        prisma.result.count({ where: { constructorId: teamId, position: 1 } }),
        prisma.result.count({ where: { constructorId: teamId, position: { lte: 3 } } }),
        prisma.result.aggregate({ where: { constructorId: teamId }, _sum: { points: true } }),
        prisma.result.findMany({
          where: { constructorId: teamId },
          orderBy: { race: { date: 'desc' } },
          take: 10,
          select: {
            id: true,
            position: true,
            points: true,
            race: { select: { raceName: true } },
            driver: { select: { givenName: true, familyName: true } },
          },
        }),
        prisma.result.findMany({
          where: { constructorId: teamId },
          orderBy: { race: { date: 'desc' } },
          distinct: ['driverId'],
          take: 60,
          select: {
            driver: { select: { driverId: true, givenName: true, familyName: true } },
          },
        }),
      ]);

      totals = { races, wins, podiums, points: sum._sum.points ?? 0 };
      recentResults = recent;
      drivers = seen.map((row) => ({
        name: `${row.driver.givenName} ${row.driver.familyName}`,
        driverId: row.driver.driverId,
      }));
    }
  } catch (error) {
    console.error('Error fetching constructor:', error);
    hasError = true;
  }

  if (!constructor && !hasError) {
    notFound();
  }

  if (hasError) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Link href="/constructors" className="mb-8 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a equipos
          </Button>
        </Link>

        <div className="mt-12 flex flex-col items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 p-12">
          <div className="mb-4 text-6xl">⚠️</div>
          <h2 className="mb-4 text-2xl font-bold">Base de datos no disponible</h2>
          <p className="mb-6 max-w-md text-center text-muted-foreground">
            No se puede conectar a la base de datos en este momento. Por favor, reactiva tu proyecto de Supabase.
          </p>
          <a
            href="https://supabase.com/dashboard/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ir al Dashboard de Supabase
          </a>
        </div>
      </div>
    );
  }

  const { wins, podiums, points } = totals;

  return (
    <div className="container mx-auto px-4 py-12">
      <Link href="/constructors" className="mb-8 inline-block">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a equipos
        </Button>
      </Link>

      {/* Cabecera */}
      <div className="mb-12 grid gap-8 md:grid-cols-[200px_1fr]">
        <div className="flex items-center justify-center md:items-start">
          {/* `relative` y `overflow-hidden` por la barra de color de la
              izquierda: la identidad del equipo tiene que estar presente aqui,
              no solo en el logo. Hasta hoy esta pantalla no tenia ninguna. */}
          <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-lg border border-border bg-card p-6">
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1.5"
              style={{ backgroundColor: teamColor(constructor!.constructorId).color }}
            />
            <TeamLogo
              src={constructor!.logoUrl}
              name={constructor!.name}
              constructorId={constructor!.constructorId}
              size="lg"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="mb-2 text-4xl font-bold md:text-5xl">{constructor!.name}</h1>
            <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
              <Flag className="h-4 w-4" />
              {constructor!.nationality}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="h-4 w-4" />
                Victorias
              </div>
              <div className="text-2xl font-semibold tabular-nums">{wins}</div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Medal className="h-4 w-4" />
                Podios
              </div>
              <div className="text-2xl font-semibold tabular-nums">{podiums}</div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Puntos
              </div>
              <div className="text-2xl font-semibold tabular-nums">{points}</div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Datos calculados sobre las {totals.races} carreras registradas en ApexData.
          </p>
        </div>
      </div>

      {/* Pilotos */}
      {drivers.length > 0 && (
        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">Pilotos</h2>
          <div className="flex flex-wrap gap-3">
            {drivers.map((driver) => (
              <Link
                key={driver.driverId}
                href={`/drivers/${driver.driverId}`}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {driver.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Resultados recientes */}
      {recentResults.length > 0 && (
        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">Resultados recientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
                <caption className="sr-only">Últimos resultados del equipo</caption>
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th scope="col" className="pb-3 pr-4">Carrera</th>
                  <th scope="col" className="pb-3 pr-4">Piloto</th>
                  <th scope="col" className="pb-3 pr-4">Posición</th>
                  <th scope="col" className="pb-3">Puntos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentResults.map((result) => (
                  <tr key={result.id} className="text-sm hover:bg-muted/50">
                    <td className="py-3 pr-4 font-medium">{result.race.raceName}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {result.driver.givenName} {result.driver.familyName}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold tabular-nums text-primary">
                        {result.position ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 tabular-nums">{result.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {constructor!.url && (
        <div className="flex justify-center">
          <a
            href={constructor!.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Ver más información en Wikipedia →
          </a>
        </div>
      )}
    </div>
  );
}
