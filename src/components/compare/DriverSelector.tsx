'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Trophy, Flag, Calendar, TrendingUp } from 'lucide-react';
import type { Driver, Result, Race, Season } from '@prisma/client';

type DriverWithResults = Driver & {
  results: (Result & {
    race: Race & {
      season: Season;
    };
  })[];
};

interface DriverSelectorProps {
  drivers: DriverWithResults[];
}

export function DriverSelector({ drivers }: DriverSelectorProps) {
  const [driver1, setDriver1] = useState<DriverWithResults | null>(null);
  const [driver2, setDriver2] = useState<DriverWithResults | null>(null);
  const [search1, setSearch1] = useState('');
  const [search2, setSearch2] = useState('');
  const [showDropdown1, setShowDropdown1] = useState(false);
  const [showDropdown2, setShowDropdown2] = useState(false);

  const filteredDrivers1 = drivers.filter(
    (d) =>
      d.id !== driver2?.id &&
      (d.givenName.toLowerCase().includes(search1.toLowerCase()) ||
        d.familyName.toLowerCase().includes(search1.toLowerCase()) ||
        d.code?.toLowerCase().includes(search1.toLowerCase()))
  );

  const filteredDrivers2 = drivers.filter(
    (d) =>
      d.id !== driver1?.id &&
      (d.givenName.toLowerCase().includes(search2.toLowerCase()) ||
        d.familyName.toLowerCase().includes(search2.toLowerCase()) ||
        d.code?.toLowerCase().includes(search2.toLowerCase()))
  );

  const calculateStats = (driver: DriverWithResults) => {
    const results = driver.results;
    if (results.length === 0) {
      return {
        totalRaces: 0,
        wins: 0,
        podiums: 0,
        avgPosition: null,
      };
    }

    const wins = results.filter((r) => Number(r.position) === 1).length;
    const podiums = results.filter(
      (r) => Number(r.position) >= 1 && Number(r.position) <= 3
    ).length;
    const totalRaces = results.length;
    const validPositions = results.filter((r) => r.position).map((r) => Number(r.position));
    const avgPosition =
      validPositions.length > 0
        ? (validPositions.reduce((a, b) => a + b, 0) / validPositions.length).toFixed(1)
        : null;

    return {
      totalRaces,
      wins,
      podiums,
      avgPosition,
    };
  };

  return (
    <div className="space-y-8">
      {/* Selection Area */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Driver 1 Selector */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-muted-foreground">
            Piloto 1
          </label>
          <div className="relative">
            {driver1 ? (
              <div className="flex items-center justify-between rounded-lg border-2 border-primary bg-primary/5 p-4">
                <div>
                  <div className="font-bold">
                    {driver1.givenName} {driver1.familyName}
                  </div>
                  <div className="text-sm text-muted-foreground">{driver1.nationality}</div>
                </div>
                <button
                  onClick={() => {
                    setDriver1(null);
                    setSearch1('');
                  }}
                  className="rounded-full p-1 hover:bg-primary/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar piloto..."
                    value={search1}
                    onChange={(e) => {
                      setSearch1(e.target.value);
                      setShowDropdown1(true);
                    }}
                    onFocus={() => setShowDropdown1(true)}
                    className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 focus:border-primary focus:outline-none"
                  />
                </div>

                {showDropdown1 && search1 && (
                  <div className="absolute z-10 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                    {filteredDrivers1.slice(0, 10).map((driver) => (
                      <button
                        key={driver.id}
                        onClick={() => {
                          setDriver1(driver);
                          setSearch1('');
                          setShowDropdown1(false);
                        }}
                        className="w-full border-b border-border p-4 text-left transition-colors hover:bg-muted/50 last:border-b-0"
                      >
                        <div className="font-semibold">
                          {driver.givenName} {driver.familyName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {driver.code && `${driver.code} • `}
                          {driver.nationality}
                        </div>
                      </button>
                    ))}
                    {filteredDrivers1.length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No se encontraron pilotos
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Driver 2 Selector */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-muted-foreground">
            Piloto 2
          </label>
          <div className="relative">
            {driver2 ? (
              <div className="flex items-center justify-between rounded-lg border-2 border-primary bg-primary/5 p-4">
                <div>
                  <div className="font-bold">
                    {driver2.givenName} {driver2.familyName}
                  </div>
                  <div className="text-sm text-muted-foreground">{driver2.nationality}</div>
                </div>
                <button
                  onClick={() => {
                    setDriver2(null);
                    setSearch2('');
                  }}
                  className="rounded-full p-1 hover:bg-primary/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar piloto..."
                    value={search2}
                    onChange={(e) => {
                      setSearch2(e.target.value);
                      setShowDropdown2(true);
                    }}
                    onFocus={() => setShowDropdown2(true)}
                    className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 focus:border-primary focus:outline-none"
                  />
                </div>

                {showDropdown2 && search2 && (
                  <div className="absolute z-10 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                    {filteredDrivers2.slice(0, 10).map((driver) => (
                      <button
                        key={driver.id}
                        onClick={() => {
                          setDriver2(driver);
                          setSearch2('');
                          setShowDropdown2(false);
                        }}
                        className="w-full border-b border-border p-4 text-left transition-colors hover:bg-muted/50 last:border-b-0"
                      >
                        <div className="font-semibold">
                          {driver.givenName} {driver.familyName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {driver.code && `${driver.code} • `}
                          {driver.nationality}
                        </div>
                      </button>
                    ))}
                    {filteredDrivers2.length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No se encontraron pilotos
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      {driver1 && driver2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats Comparison */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-6 text-xl font-bold">Estadísticas</h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Total Races */}
              <StatComparison
                icon={<Flag className="h-5 w-5" />}
                label="Carreras"
                value1={calculateStats(driver1).totalRaces}
                value2={calculateStats(driver2).totalRaces}
              />

              {/* Wins */}
              <StatComparison
                icon={<Trophy className="h-5 w-5" />}
                label="Victorias"
                value1={calculateStats(driver1).wins}
                value2={calculateStats(driver2).wins}
              />

              {/* Podiums */}
              <StatComparison
                icon={<TrendingUp className="h-5 w-5" />}
                label="Podios"
                value1={calculateStats(driver1).podiums}
                value2={calculateStats(driver2).podiums}
              />

              {/* Avg Position */}
              <StatComparison
                icon={<Calendar className="h-5 w-5" />}
                label="Pos. Promedio"
                value1={calculateStats(driver1).avgPosition || 'N/A'}
                value2={calculateStats(driver2).avgPosition || 'N/A'}
                lowerIsBetter
              />
            </div>
          </div>

          {/* Driver Info */}
          <div className="grid gap-6 lg:grid-cols-2">
            <DriverInfoCard driver={driver1} stats={calculateStats(driver1)} />
            <DriverInfoCard driver={driver2} stats={calculateStats(driver2)} />
          </div>
        </motion.div>
      )}

      {!driver1 || !driver2 && (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <GitCompare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            Selecciona dos pilotos para comenzar la comparación
          </p>
        </div>
      )}
    </div>
  );
}

function StatComparison({
  icon,
  label,
  value1,
  value2,
  lowerIsBetter = false,
}: {
  icon: React.ReactNode;
  label: string;
  value1: number | string;
  value2: number | string;
  lowerIsBetter?: boolean;
}) {
  const numValue1 = typeof value1 === 'number' ? value1 : parseFloat(String(value1));
  const numValue2 = typeof value2 === 'number' ? value2 : parseFloat(String(value2));

  const winner =
    !isNaN(numValue1) && !isNaN(numValue2)
      ? lowerIsBetter
        ? numValue1 < numValue2 ? 1 : numValue1 > numValue2 ? 2 : 0
        : numValue1 > numValue2 ? 1 : numValue1 < numValue2 ? 2 : 0
      : 0;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="flex items-center justify-between">
        <div className={`text-2xl font-bold ${winner === 1 ? 'text-primary' : ''}`}>
          {value1}
        </div>
        <div className="text-muted-foreground">vs</div>
        <div className={`text-2xl font-bold ${winner === 2 ? 'text-primary' : ''}`}>
          {value2}
        </div>
      </div>
    </div>
  );
}

function DriverInfoCard({
  driver,
  stats,
}: {
  driver: DriverWithResults;
  stats: ReturnType<typeof calculateStats>;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-bold">
            {driver.givenName} {driver.familyName}
          </h3>
          {driver.code && (
            <div className="mt-1 inline-block rounded-md bg-primary/10 px-2 py-1 text-sm font-bold text-primary">
              {driver.code}
            </div>
          )}
        </div>
        {driver.permanentNumber && (
          <div className="text-4xl font-bold text-primary opacity-20">
            #{driver.permanentNumber}
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Nacionalidad:</span>
          <span className="font-semibold">{driver.nationality}</span>
        </div>
        {driver.dateOfBirth && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha de Nacimiento:</span>
            <span className="font-semibold">
              {new Date(driver.dateOfBirth).toLocaleDateString('es-ES')}
            </span>
          </div>
        )}
        {stats.avgPosition && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Posición Promedio:</span>
            <span className="font-semibold">{stats.avgPosition}</span>
          </div>
        )}
      </div>
    </div>
  );
}
