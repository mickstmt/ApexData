import { prisma } from '@/lib/prisma';
import { ConstructorCard } from '@/components/constructors/ConstructorCard';
import { Search } from 'lucide-react';

export const metadata = {
  title: 'Equipos de F1 | ApexData',
  description: 'Todos los constructores de Fórmula 1 actuales e históricos',
};

export default async function ConstructorsPage() {
  // Obtener todos los constructores de la base de datos
  const constructors = await prisma.constructor.findMany({
    orderBy: { name: 'asc' },
  });

  // Obtener lista de nacionalidades únicas
  const nationalities = Array.from(
    new Set(constructors.map((c) => c.nationality))
  ).sort();

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
      </div>

      {/* Search bar */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar equipo..."
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {constructors.length} equipos encontrados
          </span>
        </div>
      </div>

      {/* Constructors Grid */}
      {constructors.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {constructors.map((constructor) => (
            <ConstructorCard key={constructor.id} constructor={constructor} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <p className="text-lg text-muted-foreground">
            No se encontraron equipos
          </p>
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-12 grid gap-4 rounded-lg border border-border bg-muted/50 p-6 md:grid-cols-2">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">
            {constructors.length}
          </div>
          <div className="text-sm text-muted-foreground">Total Equipos</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">
            {nationalities.length}
          </div>
          <div className="text-sm text-muted-foreground">Países Representados</div>
        </div>
      </div>
    </div>
  );
}
