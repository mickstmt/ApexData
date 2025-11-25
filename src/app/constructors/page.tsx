import { prisma } from '@/lib/prisma';
import { ConstructorsSearch } from '@/components/constructors/ConstructorsSearch';
import { fallbackConstructors } from '@/lib/fallback-data';
import { SeasonSelector } from '@/components/ui/SeasonSelector';
import type { Constructor } from '@prisma/client';

export const metadata = {
  title: 'Equipos de F1 | ApexData',
  description: 'Todos los constructores de Fórmula 1 actuales e históricos',
};

interface ConstructorsPageProps {
  searchParams: Promise<{ season?: string }>;
}

export default async function ConstructorsPage({ searchParams }: ConstructorsPageProps) {
  const params = await searchParams;
  const displayYear = params.season ? parseInt(params.season) : 2024;

  // Obtener constructores que participaron en la temporada seleccionada
  let constructors: Constructor[];
  let usingFallback = false;

  try {
    // Obtener IDs únicos de constructores de la temporada seleccionada
    const constructorIdsResult = await prisma.$queryRaw<{ constructor_id: string }[]>`
      SELECT DISTINCT r."constructorId" as constructor_id
      FROM results r
      INNER JOIN races ra ON r."raceId" = ra.id
      WHERE ra.year = ${displayYear}
    `;

    const constructorIds = constructorIdsResult.map(result => result.constructor_id);

    // Obtener los datos completos de los constructores
    if (constructorIds.length > 0) {
      constructors = await prisma.constructor.findMany({
        where: {
          id: {
            in: constructorIds,
          },
        },
        orderBy: { name: 'asc' },
      });
    } else {
      constructors = [];
    }

    // Si no hay constructores para esa temporada, buscar todos los disponibles
    if (constructors.length === 0) {
      constructors = await prisma.constructor.findMany({
        orderBy: { name: 'asc' },
      });
    }

    // Si aún no hay constructores, usar datos de ejemplo
    if (constructors.length === 0) {
      constructors = fallbackConstructors;
      usingFallback = true;
    }
  } catch (error) {
    console.error('Error fetching constructors:', error);
    constructors = fallbackConstructors;
    usingFallback = true;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">
              Equipos de <span className="text-primary">Fórmula 1</span>
            </h1>
          </div>
          <SeasonSelector currentSeason={displayYear} />
        </div>
        <p className="text-lg text-muted-foreground">
          Explora la información de {constructors.length} constructores de la temporada {displayYear}
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
      <ConstructorsSearch constructors={constructors} />
    </div>
  );
}
