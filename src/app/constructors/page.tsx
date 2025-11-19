import { prisma } from '@/lib/prisma';
import { ConstructorsSearch } from '@/components/constructors/ConstructorsSearch';
import { fallbackConstructors } from '@/lib/fallback-data';

export const metadata = {
  title: 'Equipos de F1 | ApexData',
  description: 'Todos los constructores de Fórmula 1 actuales e históricos',
};

export default async function ConstructorsPage() {
  // Obtener todos los constructores de la base de datos
  let constructors;
  let usingFallback = false;

  try {
    constructors = await prisma.constructor.findMany({
      orderBy: { name: 'asc' },
    });

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
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">
          Equipos de <span className="text-primary">Fórmula 1</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Explora la información de {constructors.length} constructores de F1
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
