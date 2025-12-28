'use client';

/**
 * Analysis Page
 * Interactive telemetry analysis using FastF1 data
 */

import { useState } from 'react';
import { Activity, BarChart3, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpeedChart, TelemetryComparison, LapTimesTable } from '@/components/telemetry';
import type {
  DriverTelemetryResponse,
  TelemetryComparisonResponse,
  FastestLapsResponse,
  SessionType,
} from '@/types';

// Available sessions for demo (using round numbers for reliability)
const DEMO_SESSIONS = [
  { year: 2024, event: '1', name: 'Bahrain Grand Prix (Round 1)' },
  { year: 2024, event: '2', name: 'Saudi Arabian Grand Prix (Round 2)' },
  { year: 2024, event: '7', name: 'Monaco Grand Prix (Round 7)' },
  { year: 2024, event: '10', name: 'Spanish Grand Prix (Round 10)' },
  { year: 2023, event: '22', name: 'Abu Dhabi Grand Prix (Round 22)' },
];

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: 'R', label: 'Race' },
  { value: 'Q', label: 'Qualifying' },
  { value: 'FP1', label: 'FP1' },
  { value: 'FP2', label: 'FP2' },
  { value: 'FP3', label: 'FP3' },
  { value: 'S', label: 'Sprint' },
];

const DRIVERS = [
  'VER', 'PER', 'HAM', 'RUS', 'LEC', 'SAI', 'NOR', 'PIA',
  'ALO', 'STR', 'OCO', 'GAS', 'TSU', 'RIC', 'BOT', 'ZHO',
  'MAG', 'HUL', 'ALB', 'SAR',
];

export default function AnalysisPage() {
  // Selection state
  const [selectedSession, setSelectedSession] = useState(DEMO_SESSIONS[0]);
  const [sessionType, setSessionType] = useState<SessionType>('Q');
  const [driver1, setDriver1] = useState('VER');
  const [driver2, setDriver2] = useState('HAM');

  // Data state
  const [telemetry, setTelemetry] = useState<DriverTelemetryResponse | null>(null);
  const [comparison, setComparison] = useState<TelemetryComparisonResponse | null>(null);
  const [fastestLaps, setFastestLaps] = useState<FastestLapsResponse | null>(null);

  // Loading state
  const [loading, setLoading] = useState<{
    telemetry: boolean;
    comparison: boolean;
    laps: boolean;
  }>({
    telemetry: false,
    comparison: false,
    laps: false,
  });

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Fetch single driver telemetry
  const fetchTelemetry = async () => {
    setLoading((prev) => ({ ...prev, telemetry: true }));
    setError(null);
    try {
      const res = await fetch(
        `/api/telemetry/${selectedSession.year}/${selectedSession.event}/${sessionType}/${driver1}`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch telemetry');
      }
      const data = await res.json();
      setTelemetry(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching telemetry');
      setTelemetry(null);
    } finally {
      setLoading((prev) => ({ ...prev, telemetry: false }));
    }
  };

  // Fetch telemetry comparison
  const fetchComparison = async () => {
    setLoading((prev) => ({ ...prev, comparison: true }));
    setError(null);
    try {
      const res = await fetch(
        `/api/telemetry-compare/${selectedSession.year}/${selectedSession.event}/${sessionType}?driver1=${driver1}&driver2=${driver2}`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch comparison');
      }
      const data = await res.json();
      setComparison(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching comparison');
      setComparison(null);
    } finally {
      setLoading((prev) => ({ ...prev, comparison: false }));
    }
  };

  // Fetch fastest laps
  const fetchFastestLaps = async () => {
    setLoading((prev) => ({ ...prev, laps: true }));
    setError(null);
    try {
      const res = await fetch(
        `/api/laps/${selectedSession.year}/${selectedSession.event}/${sessionType}/fastest?limit=15`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch laps');
      }
      const data = await res.json();
      setFastestLaps(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching laps');
      setFastestLaps(null);
    } finally {
      setLoading((prev) => ({ ...prev, laps: false }));
    }
  };

  const isAnyLoading = loading.telemetry || loading.comparison || loading.laps;

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold md:text-5xl">
            Análisis de <span className="text-primary">Telemetría</span>
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Análisis detallado de telemetría usando datos de FastF1
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          ⚡ Asegúrate de que el microservicio Python esté corriendo en localhost:8000
        </p>
      </div>

      {/* Selection Controls */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Seleccionar Sesión</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Event Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Gran Premio
            </label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={`${selectedSession.year}-${selectedSession.event}`}
              onChange={(e) => {
                const [year, event] = e.target.value.split('-');
                const session = DEMO_SESSIONS.find(
                  (s) => s.year === parseInt(year) && s.event === event
                );
                if (session) setSelectedSession(session);
              }}
            >
              {DEMO_SESSIONS.map((session) => (
                <option
                  key={`${session.year}-${session.event}`}
                  value={`${session.year}-${session.event}`}
                >
                  {session.year} - {session.name}
                </option>
              ))}
            </select>
          </div>

          {/* Session Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Sesión
            </label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value as SessionType)}
            >
              {SESSION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Driver 1 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Piloto 1
            </label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={driver1}
              onChange={(e) => setDriver1(e.target.value)}
            >
              {DRIVERS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Driver 2 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Piloto 2
            </label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={driver2}
              onChange={(e) => setDriver2(e.target.value)}
            >
              {DRIVERS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-4">
          <Button
            onClick={fetchTelemetry}
            disabled={isAnyLoading}
            className="flex items-center gap-2"
          >
            {loading.telemetry ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            Cargar Telemetría ({driver1})
          </Button>

          <Button
            onClick={fetchComparison}
            disabled={isAnyLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {loading.comparison ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4" />
            )}
            Comparar {driver1} vs {driver2}
          </Button>

          <Button
            onClick={fetchFastestLaps}
            disabled={isAnyLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {loading.laps ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            Vueltas Más Rápidas
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-8">
        {/* Single Driver Telemetry */}
        {telemetry && (
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <Activity className="h-5 w-5 text-primary" />
              Telemetría - {telemetry.driver}
            </h2>
            <div className="mb-4 flex flex-wrap gap-4 text-sm">
              <span className="rounded bg-muted px-3 py-1">
                Vuelta #{telemetry.lap_number}
              </span>
              <span className="rounded bg-muted px-3 py-1">
                Tiempo: {telemetry.lap_time}
              </span>
              {telemetry.compound && (
                <span
                  className={`rounded px-3 py-1 ${
                    telemetry.compound === 'SOFT'
                      ? 'bg-red-500/20 text-red-400'
                      : telemetry.compound === 'MEDIUM'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-slate-500/20 text-slate-400'
                  }`}
                >
                  {telemetry.compound}
                </span>
              )}
              {telemetry.is_personal_best && (
                <span className="rounded bg-purple-500/20 px-3 py-1 text-purple-400">
                  Personal Best
                </span>
              )}
            </div>
            <SpeedChart
              telemetry={telemetry.telemetry}
              driver={telemetry.driver}
              height={250}
            />
          </div>
        )}

        {/* Comparison */}
        {comparison && (
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <BarChart3 className="h-5 w-5 text-primary" />
              Comparación de Velocidad
            </h2>
            <TelemetryComparison data={comparison} height={300} />
          </div>
        )}

        {/* Fastest Laps */}
        {fastestLaps && (
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <Clock className="h-5 w-5 text-primary" />
              Vueltas Más Rápidas - {fastestLaps.session.name}
            </h2>
            <LapTimesTable laps={fastestLaps.fastest_laps} showDriver={true} />
          </div>
        )}

        {/* Empty State */}
        {!telemetry && !comparison && !fastestLaps && (
          <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
            <Activity className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-4 text-2xl font-bold">Selecciona una sesión</h2>
            <p className="text-muted-foreground">
              Elige un Gran Premio, sesión y piloto(s), luego haz clic en uno de los
              botones para cargar los datos de telemetría.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              💡 La primera carga puede tardar unos segundos mientras FastF1 descarga
              los datos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
