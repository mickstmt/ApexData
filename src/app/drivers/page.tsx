import { prisma } from '@/lib/prisma';
import { DriverCard } from '@/components/drivers/DriverCard';
import { Search } from 'lucide-react';

export const metadata = {
  title: 'Pilotos de F1 | ApexData',
  description: 'Todos los pilotos de Fórmula 1 actuales e históricos',
};

export default async function DriversPage() {
  // Obtener todos los pilotos de la base de datos
  const drivers = await prisma.driver.findMany({
    orderBy: [
      { permanentNumber: 'asc' },
      { familyName: 'asc' },
    ],
  });

  // Obtener lista de nacionalidades únicas para filtros
  const nationalities = Array.from(
    new Set(drivers.map((d) => d.nationality))
  ).sort();

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
      </div>

      {/* Search and Filters */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search bar */}
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar piloto..."
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Filters placeholder */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {drivers.length} pilotos encontrados
          </span>
        </div>
      </div>

      {/* Drivers Grid */}
      {drivers.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {drivers.map((driver) => (
            <DriverCard key={driver.id} driver={driver} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <p className="text-lg text-muted-foreground">
            No se encontraron pilotos
          </p>
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-12 grid gap-4 rounded-lg border border-border bg-muted/50 p-6 md:grid-cols-3">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">
            {drivers.length}
          </div>
          <div className="text-sm text-muted-foreground">Total Pilotos</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">
            {nationalities.length}
          </div>
          <div className="text-sm text-muted-foreground">Nacionalidades</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">
            {drivers.filter((d) => d.permanentNumber).length}
          </div>
          <div className="text-sm text-muted-foreground">Con Número Permanente</div>
        </div>
      </div>
    </div>
  );
}
