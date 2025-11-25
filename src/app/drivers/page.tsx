import { prisma } from '@/lib/prisma';
import { DriversSearch } from '@/components/drivers/DriversSearch';
import { fallbackDrivers } from '@/lib/fallback-data';
import { SeasonSelector } from '@/components/ui/SeasonSelector';
import type { Driver } from '@prisma/client';

export const metadata = {
  title: 'Pilotos de F1 | ApexData',
  description: 'Todos los pilotos de Fórmula 1 actuales e históricos',
};

interface DriversPageProps {
  searchParams: Promise<{ season?: string }>;
}

export default async function DriversPage({ searchParams }: DriversPageProps) {
  const params = await searchParams;
  const displayYear = params.season ? parseInt(params.season) : 2024;

  // Obtener pilotos que participaron en la temporada seleccionada
  let drivers: Driver[];
  let usingFallback = false;

  try {
    // Obtener IDs únicos de pilotos de la temporada seleccionada usando una consulta raw
    const driverIdsResult = await prisma.$queryRaw<{ driver_id: string }[]>`
      SELECT DISTINCT r."driverId" as driver_id
      FROM results r
      INNER JOIN races ra ON r."raceId" = ra.id
      WHERE ra.year = ${displayYear}
    `;

    const driverIds = driverIdsResult.map(result => result.driver_id);

    // Obtener los datos completos de los pilotos
    if (driverIds.length > 0) {
      drivers = await prisma.driver.findMany({
        where: {
          id: {
            in: driverIds,
          },
        },
        orderBy: [
          { permanentNumber: 'asc' },
          { familyName: 'asc' },
        ],
      });
    } else {
      drivers = [];
    }

    // Si no hay pilotos para esa temporada, buscar todos los pilotos disponibles
    if (drivers.length === 0) {
      drivers = await prisma.driver.findMany({
        orderBy: [
          { permanentNumber: 'asc' },
          { familyName: 'asc' },
        ],
      });
    }

    // Si aún no hay pilotos, usar datos de ejemplo
    if (drivers.length === 0) {
      drivers = fallbackDrivers;
      usingFallback = true;
    }
  } catch (error) {
    console.error('Error fetching drivers:', error);
    drivers = fallbackDrivers;
    usingFallback = true;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">
              Pilotos de <span className="text-primary">Fórmula 1</span>
            </h1>
          </div>
          <SeasonSelector currentSeason={displayYear} />
        </div>
        <p className="text-lg text-muted-foreground">
          Explora la información completa de {drivers.length} pilotos de la temporada {displayYear}
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
      </div>

      {/* Search component with client-side filtering */}
      <DriversSearch drivers={drivers} />
    </div>
  );
}
