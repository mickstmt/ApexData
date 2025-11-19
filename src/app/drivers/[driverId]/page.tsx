import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, Flag, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DriverDetailPageProps {
  params: Promise<{
    driverId: string;
  }>;
}

export async function generateMetadata({ params }: DriverDetailPageProps) {
  const { driverId } = await params;
  const driver = await prisma.driver.findUnique({
    where: { driverId },
  });

  if (!driver) {
    return {
      title: 'Piloto no encontrado | ApexData',
    };
  }

  return {
    title: `${driver.givenName} ${driver.familyName} | ApexData`,
    description: `Información completa de ${driver.givenName} ${driver.familyName}, piloto de Fórmula 1`,
  };
}

export default async function DriverDetailPage({ params }: DriverDetailPageProps) {
  const { driverId } = await params;

  let driver;
  let hasError = false;

  try {
    driver = await prisma.driver.findUnique({
      where: { driverId },
      include: {
        results: {
          take: 10,
          orderBy: { race: { date: 'desc' } },
          include: {
            race: {
              include: {
                circuit: true,
              },
            },
            constructor: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching driver:', error);
    hasError = true;
  }

  if (!driver && !hasError) {
    notFound();
  }

  // Si hay error de conexión, mostrar página de error
  if (hasError) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Link href="/drivers" className="mb-8 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a pilotos
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

  const age = driver!.dateOfBirth
    ? new Date().getFullYear() - new Date(driver!.dateOfBirth).getFullYear()
    : null;

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Back button */}
      <Link href="/drivers" className="mb-8 inline-block">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a pilotos
        </Button>
      </Link>

      {/* Header Section */}
      <div className="mb-12 grid gap-8 md:grid-cols-[200px_1fr]">
        {/* Avatar */}
        <div className="flex items-center justify-center md:items-start">
          <div className="flex h-48 w-48 items-center justify-center rounded-full border-4 border-primary bg-primary/10">
            <User className="h-24 w-24 text-primary" />
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6">
          {/* Name and Number */}
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-4xl font-bold md:text-5xl">
                {driver!.givenName} {driver!.familyName}
              </h1>
              {driver!.permanentNumber && (
                <span className="text-5xl font-bold text-primary">
                  #{driver!.permanentNumber}
                </span>
              )}
            </div>
            {driver!.code && (
              <div className="inline-block rounded-md bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                {driver!.code}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Nationality */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Flag className="h-4 w-4" />
                Nacionalidad
              </div>
              <div className="text-lg font-semibold">{driver!.nationality}</div>
            </div>

            {/* Age */}
            {age && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Edad
                </div>
                <div className="text-lg font-semibold">{age} años</div>
              </div>
            )}

            {/* Permanent Number */}
            {driver!.permanentNumber && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  Número Permanente
                </div>
                <div className="text-lg font-semibold">{driver!.permanentNumber}</div>
              </div>
            )}
          </div>

          {/* Bio */}
          {driver!.dateOfBirth && (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                Nacido el {new Date(driver!.dateOfBirth).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Results */}
      {driver!.results.length > 0 && (
        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">
            Resultados Recientes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="pb-3 pr-4">Carrera</th>
                  <th className="pb-3 pr-4">Circuito</th>
                  <th className="pb-3 pr-4">Equipo</th>
                  <th className="pb-3">Posición</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {driver!.results.map((result, index) => (
                  <tr key={index} className="text-sm hover:bg-muted/50">
                    <td className="py-3 pr-4 font-medium">
                      {result.race.raceName}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {result.race.circuit.name}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {result.constructor.name}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                        {result.position}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* External Link */}
      {driver!.url && (
        <div className="flex justify-center">
          <a
            href={driver!.url}
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
