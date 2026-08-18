import { GitCompare } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { DriverSelector } from '@/components/compare/DriverSelector';
import { fallbackDrivers } from '@/lib/fallback-data';

// Se cachean los DATOS, no la página. Marcarla como estática con
// `revalidate` la hacía consultar la base durante el build, y el build no
// tiene base de datos: el CI construye con credenciales falsas a propósito, y
// la página se habría horneado con el contenido de reserva. Con la página
// dinámica y la consulta en `unstable_cache`, Supabase recibe una consulta por
// hora en vez de una por visita, y el build no toca la base.
export const dynamic = 'force-dynamic';

const getDriversForComparison = unstable_cache(
  () =>
    prisma.driver.findMany({
      include: {
        results: {
          take: 5,
          orderBy: { race: { date: 'desc' } },
          include: {
            team: true,
            race: { include: { season: true } },
          },
        },
      },
      orderBy: [{ familyName: 'asc' }],
    }),
  ['compare-drivers'],
  { revalidate: 3600 }
);

export const metadata = {
  title: 'Comparador de Pilotos | ApexData',
  description: 'Compara estadísticas y rendimiento entre pilotos de Fórmula 1',
};

export default async function ComparePage() {
  let drivers;
  let usingFallback = false;

  try {
    drivers = await getDriversForComparison();

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
