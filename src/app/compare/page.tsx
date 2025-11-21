import { GitCompare } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { DriverSelector } from '@/components/compare/DriverSelector';
import { fallbackDrivers } from '@/lib/fallback-data';

export const metadata = {
  title: 'Comparador de Pilotos | ApexData',
  description: 'Compara estadísticas y rendimiento entre pilotos de Fórmula 1',
};

export default async function ComparePage() {
  let drivers;
  let usingFallback = false;

  try {
    // Get all drivers with their results for comparison
    drivers = await prisma.driver.findMany({
      include: {
        results: {
          take: 5,
          orderBy: { race: { date: 'desc' } },
          include: {
            constructor: true,
            race: {
              include: {
                season: true,
              },
            },
          },
        },
      },
      orderBy: [
        { familyName: 'asc' },
      ],
    });

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
        <div className="mb-4 flex items-center gap-3">
          <GitCompare className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold md:text-5xl">
            Comparador de <span className="text-primary">Pilotos</span>
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Selecciona dos pilotos para comparar sus estadísticas y rendimiento
        </p>

        {usingFallback && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              <strong>⚠️ Base de datos no disponible:</strong> Mostrando datos de ejemplo.
            </p>
          </div>
        )}
      </div>

      {/* Driver Selector Component */}
      <DriverSelector drivers={drivers} />
    </div>
  );
}
