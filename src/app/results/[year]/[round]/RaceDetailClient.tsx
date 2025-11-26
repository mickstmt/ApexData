'use client';

import { useState } from 'react';
import { Trophy, Calendar, MapPin, Flag, Zap, Construction, Clock } from 'lucide-react';
import Link from 'next/link';
import type { Race, Circuit, Result, Driver, Constructor, Qualifying } from '@prisma/client';

type RaceWithDetails = Race & {
  circuit: Circuit;
  results: (Result & {
    driver: Driver;
    constructor: Constructor;
  })[];
  qualifying: (Qualifying & {
    driver: Driver;
    constructor: Constructor;
  })[];
};

interface RaceDetailClientProps {
  race: RaceWithDetails;
  year: number;
}

type SessionTab =
  | 'practice1'
  | 'practice2'
  | 'practice3'
  | 'sprint-qualifying'
  | 'sprint'
  | 'qualifying'
  | 'race';

interface TabConfig {
  id: SessionTab;
  label: string;
  shortLabel: string;
}

export default function RaceDetailClient({ race, year }: RaceDetailClientProps) {
  const [activeTab, setActiveTab] = useState<SessionTab>('race');

  // Determinar si es un fin de semana Sprint
  // Por ahora, asumimos que no es Sprint (puedes agregar lógica basada en la ronda)
  const isSprintWeekend = false;

  // Configuración de tabs según el tipo de fin de semana
  const tabs: TabConfig[] = isSprintWeekend
    ? [
        { id: 'practice1', label: 'Práctica Libre 1', shortLabel: 'PL1' },
        { id: 'sprint-qualifying', label: 'Clasificación Sprint', shortLabel: 'CS' },
        { id: 'sprint', label: 'Sprint', shortLabel: 'SPRINT' },
        { id: 'qualifying', label: 'Clasificación', shortLabel: 'CLASI' },
        { id: 'race', label: 'Carrera', shortLabel: 'CARRERA' },
      ]
    : [
        { id: 'practice1', label: 'Práctica Libre 1', shortLabel: 'PL1' },
        { id: 'practice2', label: 'Práctica Libre 2', shortLabel: 'PL2' },
        { id: 'practice3', label: 'Práctica Libre 3', shortLabel: 'PL3' },
        { id: 'qualifying', label: 'Clasificación', shortLabel: 'CLASI' },
        { id: 'race', label: 'Carrera', shortLabel: 'CARRERA' },
      ];

  // Find fastest lap
  const fastestLapResult = race.results
    .filter((r) => r.fastestLapTime)
    .sort((a, b) => {
      if (!a.fastestLapTime || !b.fastestLapTime) return 0;
      return a.fastestLapTime.localeCompare(b.fastestLapTime);
    })[0];

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/results?season=${year}`}
          className="text-sm text-muted-foreground hover:text-primary transition-colors mb-4 inline-block"
        >
          ← Volver a Resultados
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="font-semibold">ROUND {race.round}</span>
              <span>•</span>
              <span>{year}</span>
            </div>
            <h1 className="text-4xl font-bold mb-2 md:text-5xl">{race.raceName}</h1>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{race.circuit.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(race.date).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Tabs */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex gap-2 border-b border-border min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">{tab.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'race' ? (
        <>
          {/* Race Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Winner */}
            {race.results[0] && (
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Trophy className="h-4 w-4" />
                  <span className="font-semibold">GANADOR</span>
                </div>
                <div className="text-2xl font-bold">
                  {race.results[0].driver.givenName} {race.results[0].driver.familyName}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {race.results[0].constructor.name}
                </div>
              </div>
            )}

            {/* Laps */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Flag className="h-4 w-4" />
                <span className="font-semibold">VUELTAS</span>
              </div>
              <div className="text-2xl font-bold">{race.results[0]?.laps || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Vueltas completadas</div>
            </div>

            {/* Fastest Lap */}
            {fastestLapResult && (
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Zap className="h-4 w-4" />
                  <span className="font-semibold">VUELTA RÁPIDA</span>
                </div>
                <div className="text-2xl font-bold font-mono">
                  {fastestLapResult.fastestLapTime}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {fastestLapResult.driver.familyName}
                  {fastestLapResult.fastestLapSpeed &&
                    ` - ${fastestLapResult.fastestLapSpeed} km/h`}
                </div>
              </div>
            )}
          </div>

          {/* Results Table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="p-4 text-left text-sm font-semibold text-foreground w-16">POS</th>
                    <th className="p-4 text-left text-sm font-semibold text-foreground w-20">NO</th>
                    <th className="p-4 text-left text-sm font-semibold text-foreground">PILOTO</th>
                    <th className="p-4 text-left text-sm font-semibold text-foreground">EQUIPO</th>
                    <th className="p-4 text-right text-sm font-semibold text-foreground w-20">LAPS</th>
                    <th className="p-4 text-right text-sm font-semibold text-foreground w-32">
                      TIME/RETIRED
                    </th>
                    <th className="p-4 text-right text-sm font-semibold text-foreground w-20">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {race.results.map((result) => {
                    const isPodium = result.position && result.position <= 3;
                    const isWinner = result.position === 1;

                    return (
                      <tr
                        key={result.id}
                        className={`border-b border-border transition-colors hover:bg-muted/30 ${
                          isPodium ? 'bg-muted/20' : ''
                        }`}
                      >
                        {/* Position */}
                        <td className="p-4">
                          <div
                            className={`flex items-center justify-center h-10 w-10 rounded-md font-bold ${
                              isWinner
                                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                : isPodium
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted/50 text-foreground'
                            }`}
                          >
                            {result.positionText}
                          </div>
                        </td>

                        {/* Number */}
                        <td className="p-4">
                          <div className="text-lg font-bold text-muted-foreground">
                            {result.driver.permanentNumber || '—'}
                          </div>
                        </td>

                        {/* Driver */}
                        <td className="p-4">
                          <Link
                            href={`/drivers/${result.driver.driverId}`}
                            className="hover:text-primary transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                                {result.driver.code ||
                                  result.driver.familyName.slice(0, 3).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold">
                                  {result.driver.givenName} {result.driver.familyName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {result.driver.nationality}
                                </div>
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* Constructor */}
                        <td className="p-4">
                          <Link
                            href={`/constructors/${result.constructor.constructorId}`}
                            className="text-sm hover:text-primary transition-colors"
                          >
                            {result.constructor.name}
                          </Link>
                        </td>

                        {/* Laps */}
                        <td className="p-4 text-right text-sm text-muted-foreground">
                          {result.laps}
                        </td>

                        {/* Time/Status */}
                        <td className="p-4 text-right">
                          {result.time ? (
                            <span className="font-mono text-sm font-semibold">{result.time}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">{result.status}</span>
                          )}
                        </td>

                        {/* Points */}
                        <td className="p-4 text-right">
                          <span
                            className={`font-bold ${
                              result.points > 0 ? 'text-primary' : 'text-muted-foreground'
                            }`}
                          >
                            {result.points}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Podium */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Podio
              </h2>
              <div className="space-y-3">
                {race.results.slice(0, 3).map((result, index) => (
                  <div key={result.id} className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                        index === 0
                          ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                          : index === 1
                          ? 'bg-gray-400/20 text-gray-600 dark:text-gray-400'
                          : 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">
                        {result.driver.givenName} {result.driver.familyName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.constructor.name}
                      </div>
                    </div>
                    <div className="font-bold text-primary">{result.points} pts</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Circuit Info */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Información del Circuito
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Circuito:</span>
                  <span className="font-semibold">{race.circuit.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ubicación:</span>
                  <span className="font-semibold">{race.circuit.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">País:</span>
                  <span className="font-semibold">{race.circuit.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha:</span>
                  <span className="font-semibold">
                    {new Date(race.date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'qualifying' ? (
        <>
          {/* Qualifying Results */}
          {race.qualifying && race.qualifying.length > 0 ? (
            <>
              {/* Pole Position */}
              {race.qualifying[0] && (
                <div className="mb-8">
                  <div className="rounded-lg border border-primary bg-primary/5 p-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="font-semibold">POLE POSITION</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">
                          {race.qualifying[0].driver.givenName} {race.qualifying[0].driver.familyName}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {race.qualifying[0].constructor.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold font-mono text-primary">
                          {race.qualifying[0].q3 || race.qualifying[0].q2 || race.qualifying[0].q1}
                        </div>
                        <div className="text-sm text-muted-foreground">Mejor tiempo</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Qualifying Table */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="p-4 text-left text-sm font-semibold text-foreground w-16">POS</th>
                        <th className="p-4 text-left text-sm font-semibold text-foreground w-20">NO</th>
                        <th className="p-4 text-left text-sm font-semibold text-foreground">PILOTO</th>
                        <th className="p-4 text-left text-sm font-semibold text-foreground">EQUIPO</th>
                        <th className="p-4 text-right text-sm font-semibold text-foreground w-32">Q1</th>
                        <th className="p-4 text-right text-sm font-semibold text-foreground w-32">Q2</th>
                        <th className="p-4 text-right text-sm font-semibold text-foreground w-32">Q3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {race.qualifying.map((result) => {
                        const isTop3 = result.position <= 3;
                        const isPole = result.position === 1;
                        const isQ3 = result.q3 !== null;
                        const isQ2 = result.q2 !== null && !isQ3;

                        return (
                          <tr
                            key={result.id}
                            className={`border-b border-border transition-colors hover:bg-muted/30 ${
                              isTop3 ? 'bg-muted/20' : ''
                            }`}
                          >
                            {/* Position */}
                            <td className="p-4">
                              <div
                                className={`flex items-center justify-center h-10 w-10 rounded-md font-bold ${
                                  isPole
                                    ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                    : isTop3
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-muted/50 text-foreground'
                                }`}
                              >
                                {result.position}
                              </div>
                            </td>

                            {/* Number */}
                            <td className="p-4">
                              <div className="text-lg font-bold text-muted-foreground">
                                {result.driver.permanentNumber || '—'}
                              </div>
                            </td>

                            {/* Driver */}
                            <td className="p-4">
                              <Link
                                href={`/drivers/${result.driver.driverId}`}
                                className="hover:text-primary transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                                    {result.driver.code ||
                                      result.driver.familyName.slice(0, 3).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold">
                                      {result.driver.givenName} {result.driver.familyName}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {result.driver.nationality}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            </td>

                            {/* Constructor */}
                            <td className="p-4">
                              <Link
                                href={`/constructors/${result.constructor.constructorId}`}
                                className="text-sm hover:text-primary transition-colors"
                              >
                                {result.constructor.name}
                              </Link>
                            </td>

                            {/* Q1 */}
                            <td className="p-4 text-right">
                              <span className="font-mono text-sm font-semibold">
                                {result.q1 || '—'}
                              </span>
                            </td>

                            {/* Q2 */}
                            <td className="p-4 text-right">
                              {result.q2 ? (
                                <span className="font-mono text-sm font-semibold">{result.q2}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Q3 */}
                            <td className="p-4 text-right">
                              {result.q3 ? (
                                <span className="font-mono text-sm font-semibold text-primary">
                                  {result.q3}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top 3 */}
                <div className="rounded-lg border border-border bg-card p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Top 3 Qualifying
                  </h2>
                  <div className="space-y-3">
                    {race.qualifying.slice(0, 3).map((result, index) => (
                      <div key={result.id} className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                            index === 0
                              ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                              : index === 1
                              ? 'bg-gray-400/20 text-gray-600 dark:text-gray-400'
                              : 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">
                            {result.driver.givenName} {result.driver.familyName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {result.constructor.name}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-primary">
                          {result.q3 || result.q2 || result.q1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session Info */}
                <div className="rounded-lg border border-border bg-card p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Información de Clasificación
                  </h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Q3 (Top 10):</span>
                      <span className="font-semibold">
                        {race.qualifying.filter((q) => q.q3).length} pilotos
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Q2 (Top 15):</span>
                      <span className="font-semibold">
                        {race.qualifying.filter((q) => q.q2).length} pilotos
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Q1 (Todos):</span>
                      <span className="font-semibold">
                        {race.qualifying.filter((q) => q.q1).length} pilotos
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 mt-2">
                      <span className="text-muted-foreground">Total participantes:</span>
                      <span className="font-semibold">{race.qualifying.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <Clock className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-2xl font-bold">Sin Datos de Clasificación</h3>
              <p className="text-lg text-muted-foreground">
                No hay datos de clasificación disponibles para esta carrera.
              </p>
            </div>
          )}
        </>
      ) : (
        // Coming Soon for other sessions
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Construction className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-2xl font-bold">En Desarrollo</h3>
          <p className="text-lg text-muted-foreground mb-4">
            Estamos trabajando para traerte los datos de{' '}
            {tabs.find((t) => t.id === activeTab)?.label}
          </p>
          <p className="text-sm text-muted-foreground">
            Próximamente podrás ver los tiempos de vuelta, posiciones y estadísticas de todas las
            sesiones del fin de semana.
          </p>
        </div>
      )}
    </div>
  );
}
