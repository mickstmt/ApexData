'use client';

import { useId, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Trophy, Flag, Calendar, TrendingUp, GitCompare } from 'lucide-react';
import { formatBirthDate } from '@/lib/driver-age';

/**
 * Solo lo que esta pantalla usa. El tipo declaraba la carrera y la temporada
 * de cada resultado, que no se leen en ninguna parte, y eso obligaba a la
 * consulta a traerlas.
 */
type DriverWithResults = {
  id: string;
  driverId: string;
  givenName: string;
  familyName: string;
  code: string | null;
  permanentNumber: number | null;
  nationality: string;
  dateOfBirth: Date | null;
  imageUrl: string | null;
  results: { id: string; position: number | null }[];
};

interface DriverSelectorProps {
  drivers: DriverWithResults[];
}

function calculateStats(driver: DriverWithResults) {
  const results = driver.results;
  if (results.length === 0) {
    return {
      totalRaces: 0,
      wins: 0,
      podiums: 0,
      avgPosition: null as string | null,
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
}

/**
 * Buscador de piloto.
 *
 * Era un `div` con botones dentro, duplicado dos veces: sin `role="combobox"`,
 * sin `aria-expanded`, sin indicar qué opción está activa y sin flechas — solo
 * se podía usar tabulando por cada resultado. Y el botón de quitar al piloto
 * elegido no tenía nombre accesible: un lector de pantalla anunciaba «botón».
 *
 * Ahora es un combobox de verdad, y al ser uno solo los dos selectores se
 * arreglan a la vez.
 */
function DriverPicker({
  etiqueta,
  seleccionado,
  candidatos,
  busqueda,
  onBuscar,
  abierto,
  onAbrir,
  onElegir,
}: {
  etiqueta: string;
  seleccionado: DriverWithResults | null;
  candidatos: DriverWithResults[];
  busqueda: string;
  onBuscar: (valor: string) => void;
  abierto: boolean;
  onAbrir: (valor: boolean) => void;
  onElegir: (piloto: DriverWithResults | null) => void;
}) {
  const id = useId();
  const listaId = `${id}-lista`;
  const [activo, setActivo] = useState(0);

  const visibles = candidatos.slice(0, 10);
  const desplegado = abierto && busqueda.length > 0;

  const elegir = (piloto: DriverWithResults) => {
    onElegir(piloto);
    onBuscar('');
    onAbrir(false);
  };

  const onTeclado = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!desplegado || visibles.length === 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const paso = event.key === 'ArrowDown' ? 1 : -1;
      setActivo((previo) => (previo + paso + visibles.length) % visibles.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      elegir(visibles[activo]);
    } else if (event.key === 'Escape') {
      onAbrir(false);
    }
  };

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-muted-foreground">
        {etiqueta}
      </label>
      <div className="relative">
        {seleccionado ? (
          <div className="flex items-center justify-between rounded-lg border-2 border-primary bg-primary/5 p-4">
            <div>
              <div className="font-bold">
                {seleccionado.givenName} {seleccionado.familyName}
              </div>
              <div className="text-sm text-muted-foreground">{seleccionado.nationality}</div>
            </div>
            <button
              type="button"
              aria-label={`Quitar a ${seleccionado.givenName} ${seleccionado.familyName} de la comparación`}
              onClick={() => {
                onElegir(null);
                onBuscar('');
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full ring-offset-background hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground"
                aria-hidden
              />
              <input
                id={id}
                type="text"
                role="combobox"
                aria-expanded={desplegado}
                aria-controls={listaId}
                aria-autocomplete="list"
                aria-activedescendant={desplegado ? `${listaId}-${activo}` : undefined}
                autoComplete="off"
                placeholder="Buscar piloto..."
                value={busqueda}
                onChange={(e) => {
                  onBuscar(e.target.value);
                  onAbrir(true);
                  setActivo(0);
                }}
                onFocus={() => onAbrir(true)}
                onKeyDown={onTeclado}
                className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-4 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
              />
            </div>

            {desplegado && (
              // `overscroll-contain`: sin él, al llegar al final de la lista el
              // desplazamiento seguía en la página de detrás (§5 del plan).
              <ul
                id={listaId}
                role="listbox"
                aria-label={`Resultados para ${etiqueta}`}
                className="absolute z-10 mt-2 max-h-96 w-full overflow-y-auto overscroll-contain rounded-lg border border-border bg-card shadow-lg"
              >
                {visibles.map((piloto, indice) => (
                  <li key={piloto.id}>
                    <button
                      type="button"
                      id={`${listaId}-${indice}`}
                      role="option"
                      aria-selected={indice === activo}
                      onMouseEnter={() => setActivo(indice)}
                      onClick={() => elegir(piloto)}
                      className={`w-full border-b border-border p-4 text-left transition-colors last:border-b-0 ${
                        indice === activo ? 'bg-muted/50' : ''
                      }`}
                    >
                      <div className="font-semibold">
                        {piloto.givenName} {piloto.familyName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {piloto.code && `${piloto.code} • `}
                        {piloto.nationality}
                      </div>
                    </button>
                  </li>
                ))}
                {visibles.length === 0 && (
                  <li className="p-4 text-center text-sm text-muted-foreground">
                    No se encontraron pilotos
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
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

  return (
    <div className="space-y-8">
      {/* Selection Area */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DriverPicker
          etiqueta="Piloto 1"
          seleccionado={driver1}
          candidatos={filteredDrivers1}
          busqueda={search1}
          onBuscar={setSearch1}
          abierto={showDropdown1}
          onAbrir={setShowDropdown1}
          onElegir={setDriver1}
        />

        <DriverPicker
          etiqueta="Piloto 2"
          seleccionado={driver2}
          candidatos={filteredDrivers2}
          busqueda={search2}
          onBuscar={setSearch2}
          abierto={showDropdown2}
          onAbrir={setShowDropdown2}
          onElegir={setDriver2}
        />
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

      {/* Los parentesis no son decorativos: sin ellos esto se agrupa como
          `!driver1 || (!driver2 && jsx)`, que al entrar sin nadie elegido vale
          `true` y React no pinta nada. El mensaje solo aparecia despues de
          elegir al primer piloto, justo cuando ya no hacia falta. */}
      {(!driver1 || !driver2) && (
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
            <span className="font-semibold">{formatBirthDate(driver.dateOfBirth)}</span>
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
