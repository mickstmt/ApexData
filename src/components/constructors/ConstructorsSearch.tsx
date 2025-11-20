'use client';

import { useState, useMemo } from 'react';
import { ConstructorCard } from './ConstructorCard';
import { Search } from 'lucide-react';

interface Constructor {
  id: string;
  constructorId: string;
  name: string;
  nationality: string;
  url: string | null;
}

interface ConstructorsSearchProps {
  constructors: Constructor[];
}

export function ConstructorsSearch({ constructors }: ConstructorsSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNationality, setSelectedNationality] = useState<string>('all');

  // Get unique nationalities
  const nationalities = useMemo(() => {
    return Array.from(new Set(constructors.map((c) => c.nationality))).sort();
  }, [constructors]);

  // Filter constructors based on search and nationality
  const filteredConstructors = useMemo(() => {
    return constructors.filter((constructor) => {
      const matchesSearch =
        searchQuery === '' ||
        constructor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        constructor.constructorId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesNationality =
        selectedNationality === 'all' || constructor.nationality === selectedNationality;

      return matchesSearch && matchesNationality;
    });
  }, [constructors, searchQuery, selectedNationality]);

  return (
    <>
      {/* Search and Filters */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search bar */}
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar equipo por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Nationality filter */}
        <div className="flex items-center gap-4">
          <select
            value={selectedNationality}
            onChange={(e) => setSelectedNationality(e.target.value)}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Todas las nacionalidades</option>
            {nationalities.map((nationality) => (
              <option key={nationality} value={nationality}>
                {nationality}
              </option>
            ))}
          </select>

          <span className="text-sm text-muted-foreground">
            {filteredConstructors.length} equipos encontrados
          </span>
        </div>
      </div>

      {/* Constructors Grid */}
      {filteredConstructors.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredConstructors.map((constructor, index) => (
            <ConstructorCard key={constructor.id} constructor={constructor} index={index} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <p className="text-lg text-muted-foreground">
            No se encontraron equipos con los filtros aplicados
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedNationality('all');
            }}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </>
  );
}
