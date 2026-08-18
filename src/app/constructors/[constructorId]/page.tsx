import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Flag, Trophy, Medal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamLogo } from '@/components/ui/OptimizedImage';

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
  let hasError = false;

  try {
    constructor = await prisma.team.findUnique({
      where: { constructorId },
      include: {
        results: {
          orderBy: { race: { date: 'desc' } },
          include: {
            race: { include: { circuit: true } },
            driver: true,
            // Explícito para que TypeScript no herede Object.prototype.constructor
            // al comparar este literal con ResultInclude. Ver src/lib/prisma.ts.
            team: false,
          },
        },
      },
    });
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

  const results = constructor!.results;

  const wins = results.filter((r) => r.position === 1).length;
  const podiums = results.filter((r) => r.position !== null && r.position <= 3).length;
  const points = results.reduce((sum, r) => sum + r.points, 0);

  // Pilotos que han corrido para el equipo, del más reciente al más antiguo.
  const driversSeen = new Map<string, { name: string; driverId: string }>();
  for (const result of results) {
    if (!driversSeen.has(result.driver.driverId)) {
      driversSeen.set(result.driver.driverId, {
        name: `${result.driver.givenName} ${result.driver.familyName}`,
        driverId: result.driver.driverId,
      });
    }
  }
  const drivers = Array.from(driversSeen.values());

  const recentResults = results.slice(0, 10);

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
          <div className="flex h-48 w-48 items-center justify-center rounded-lg border border-border bg-card p-6">
            <TeamLogo src={constructor!.logoUrl} name={constructor!.name} size="lg" />
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
            Datos calculados sobre las {results.length} carreras registradas en ApexData.
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
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="pb-3 pr-4">Carrera</th>
                  <th className="pb-3 pr-4">Piloto</th>
                  <th className="pb-3 pr-4">Posición</th>
                  <th className="pb-3">Puntos</th>
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
