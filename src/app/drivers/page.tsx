import { prisma } from '@/lib/prisma';
import { DriversSearch } from '@/components/drivers/DriversSearch';
import { fallbackDrivers } from '@/lib/fallback-data';

export const metadata = {
  title: 'Pilotos de F1 | ApexData',
  description: 'Todos los pilotos de Fórmula 1 actuales e históricos',
};

export default async function DriversPage() {
  // Obtener todos los pilotos de la base de datos
  let drivers;
  let usingFallback = false;

  try {
    drivers = await prisma.driver.findMany({
      orderBy: [
        { permanentNumber: 'asc' },
        { familyName: 'asc' },
      ],
    });

    // Si no hay pilotos, usar datos de ejemplo
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
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">
          Pilotos de <span className="text-primary">Fórmula 1</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Explora la información completa de {drivers.length} pilotos de F1
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
