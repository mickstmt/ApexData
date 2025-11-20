'use client';

import { useState, useMemo } from 'react';
import { DriverCard } from './DriverCard';
import { Search } from 'lucide-react';

interface Driver {
  id: string;
  driverId: string;
  givenName: string;
  familyName: string;
  permanentNumber: number | null;
  code: string | null;
  nationality: string;
  dateOfBirth: Date | null;
  url: string | null;
}

interface DriversSearchProps {
  drivers: Driver[];
}

export function DriversSearch({ drivers }: DriversSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNationality, setSelectedNationality] = useState<string>('all');

  // Get unique nationalities
  const nationalities = useMemo(() => {
    return Array.from(new Set(drivers.map((d) => d.nationality))).sort();
  }, [drivers]);

  // Filter drivers based on search and nationality
  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch =
        searchQuery === '' ||
        driver.givenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.familyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.permanentNumber?.toString().includes(searchQuery);

      const matchesNationality =
        selectedNationality === 'all' || driver.nationality === selectedNationality;

      return matchesSearch && matchesNationality;
    });
  }, [drivers, searchQuery, selectedNationality]);

  return (
    <>
      {/* Search and Filters */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search bar */}
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar piloto por nombre, código o número..."
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
            {filteredDrivers.length} pilotos encontrados
          </span>
        </div>
      </div>

      {/* Drivers Grid */}
      {filteredDrivers.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDrivers.map((driver, index) => (
            <DriverCard key={driver.id} driver={driver} index={index} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <p className="text-lg text-muted-foreground">
            No se encontraron pilotos con los filtros aplicados
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
