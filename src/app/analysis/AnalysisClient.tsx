'use client';

/**
 * Analysis Page
 * Interactive telemetry analysis using FastF1 data
 */

import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Clock,
  CloudSun,
  Layers,
  Loader2,
  Map as MapaIcono,
  TrendingUp,
  ScatterChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LapTimesTable } from '@/components/telemetry';
import { TelemetryChart, type TelemetryTrace } from '@/components/telemetry/TelemetryChart';
import { TrackMap } from '@/components/telemetry/TrackMap';
import { StintChart } from '@/components/telemetry/StintChart';
import { RaceProgress } from '@/components/charts/RaceProgress';
import { teamIdFromName } from '@/lib/team-colors';
import { LapScatter } from '@/components/charts/LapScatter';
import { PaceBoxes } from '@/components/charts/PaceBoxes';
import { SessionWeather } from '@/components/telemetry/SessionWeather';
import { compoundColor } from '@/lib/team-colors';
import type { SessionOption, DriverOption } from './options';
import type {
  DriverTelemetryResponse,
  TelemetryComparisonResponse,
  FastestLapsResponse,
  SessionLapsResponse,
  SessionType,
  SessionWeatherResponse,
  StintsResponse,
  TrackMapResponse,
} from '@/types';

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: 'R', label: 'Carrera' },
  { value: 'Q', label: 'Clasificación' },
  { value: 'FP1', label: 'FP1' },
  { value: 'FP2', label: 'FP2' },
  { value: 'FP3', label: 'FP3' },
  { value: 'S', label: 'Sprint' },
];

export function AnalysisClient({
  sessions,
  drivers,
  serviceConfigured,
}: {
  sessions: SessionOption[];
  drivers: DriverOption[];
  serviceConfigured: boolean;
}) {
  const DEMO_SESSIONS = sessions.map((session) => ({
    year: session.year,
    event: String(session.round),
    name: session.name,
  }));
  const DRIVERS = drivers.map((driver) => driver.code);
  // Selection state. The list can legitimately be empty (a fresh database, or
  // no season from 2018 seeded yet), so it never indexes blindly.
  const [selectedSession, setSelectedSession] = useState(
    DEMO_SESSIONS[0] ?? { year: new Date().getFullYear(), event: '1', name: 'Sin sesiones' }
  );
  const [sessionType, setSessionType] = useState<SessionType>('Q');
  const [driver1, setDriver1] = useState(DRIVERS[0] ?? 'VER');
  const [driver2, setDriver2] = useState(DRIVERS[1] ?? 'HAM');

  // Data state
  const [telemetry, setTelemetry] = useState<DriverTelemetryResponse | null>(null);
  const [comparison, setComparison] = useState<TelemetryComparisonResponse | null>(null);
  const [fastestLaps, setFastestLaps] = useState<FastestLapsResponse | null>(null);
  const [trackMap, setTrackMap] = useState<TrackMapResponse | null>(null);
  const [stints, setStints] = useState<StintsResponse | null>(null);
  const [raceLaps, setRaceLaps] = useState<SessionLapsResponse | null>(null);

  /**
   * El equipo de cada piloto **en la sesión que se está mirando**.
   *
   * La lista de `drivers` sale de la última carrera, así que al abrir una
   * sesión de 2024 los que ya no compiten se quedaban sin equipo y salían
   * grises en los tres gráficos. Las vueltas traen el equipo de cada piloto en
   * esa sesión, que además acierta con quien cambió de equipo a mitad de
   * temporada; la lista queda como respaldo para cuando aún no se han cargado.
   */
  const equiposDeLaSesion = useMemo(() => {
    const mapa = new Map<string, string>();

    for (const lap of raceLaps?.laps ?? []) {
      if (!lap.Driver || mapa.has(lap.Driver)) continue;

      const id = teamIdFromName(lap.Team);
      if (id) mapa.set(lap.Driver, id);
    }

    return mapa;
  }, [raceLaps]);

  const teamOf = (code: string) =>
    equiposDeLaSesion.get(code) ??
    drivers.find((driver) => driver.code === code)?.constructorId ??
    null;

  const [weather, setWeather] = useState<SessionWeatherResponse | null>(null);

  /**
   * Metros de vuelta señalados, compartidos por las trazas y el mapa.
   *
   * Vive aquí y no dentro de cada gráfico porque es exactamente lo que los une:
   * mover el dedo sobre la velocidad mueve el punto sobre el asfalto, y al
   * revés. Es la función que distingue a f1-tempo, y no necesitaba más dato
   * nuevo que la distancia de cada punto del trazado.
   */
  const [cursorVuelta, setCursorVuelta] = useState<number | null>(null);

  // Loading state
  const [loading, setLoading] = useState<{
    telemetry: boolean;
    comparison: boolean;
    laps: boolean;
    track: boolean;
    stints: boolean;
    race: boolean;
    weather: boolean;
  }>({
    telemetry: false,
    comparison: false,
    laps: false,
    track: false,
    stints: false,
    race: false,
    weather: false,
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
      setCursorVuelta(null);
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

  // Trazado del circuito coloreado por velocidad
  const fetchTrackMap = async () => {
    setLoading((prev) => ({ ...prev, track: true }));
    setError(null);
    try {
      const res = await fetch(
        `/api/telemetry/${selectedSession.year}/${selectedSession.event}/${sessionType}/${driver1}/track`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'No se pudo cargar el trazado');
      }
      setTrackMap(await res.json());
      setCursorVuelta(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el trazado');
      setTrackMap(null);
    } finally {
      setLoading((prev) => ({ ...prev, track: false }));
    }
  };

  // Estrategia de neumáticos de la sesión
  const fetchStints = async () => {
    setLoading((prev) => ({ ...prev, stints: true }));
    setError(null);
    try {
      const res = await fetch(
        `/api/laps/${selectedSession.year}/${selectedSession.event}/${sessionType}/stints`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'No se pudo cargar la estrategia');
      }
      setStints(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la estrategia');
      setStints(null);
    } finally {
      setLoading((prev) => ({ ...prev, stints: false }));
    }
  };

  // Condiciones de la sesión: lo que enseñaba la retirada /telemetry, pero de
  // la sesión elegida y desde FastF1 en vez de «la última que hubiera».
  const fetchWeather = async () => {
    setLoading((prev) => ({ ...prev, weather: true }));
    setError(null);
    try {
      const res = await fetch(
        `/api/weather/${selectedSession.year}/${selectedSession.event}/${sessionType}`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'No se pudieron cargar las condiciones');
      }
      setWeather(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las condiciones');
      setWeather(null);
    } finally {
      setLoading((prev) => ({ ...prev, weather: false }));
    }
  };

  // Vueltas de la sesión completa: la base de los dos gráficos de carrera
  const fetchRaceProgress = async () => {
    setLoading((prev) => ({ ...prev, race: true }));
    setError(null);
    try {
      const res = await fetch(
        `/api/laps/${selectedSession.year}/${selectedSession.event}/${sessionType}`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'No se pudo cargar la carrera');
      }
      setRaceLaps(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la carrera');
      setRaceLaps(null);
    } finally {
      setLoading((prev) => ({ ...prev, race: false }));
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

  /**
   * El mapa y las trazas solo se sincronizan si son del mismo piloto: se puede
   * cambiar de piloto y cargar el trazado sin recargar las trazas, y entonces
   * cada lienzo estaría señalando un punto de una vuelta distinta.
   */
  const mismoPiloto = Boolean(telemetry && trackMap && telemetry.driver === trackMap.driver);

  const isAnyLoading =
    loading.telemetry ||
    loading.comparison ||
    loading.laps ||
    loading.track ||
    loading.stints ||
    loading.race ||
    loading.weather;

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
          {serviceConfigured
            ? '⚡ Los datos vienen del microservicio FastF1; la primera consulta de una sesión tarda porque se descarga entera.'
            : '⚠️ La telemetría necesita el microservicio FastF1, que todavía no está conectado. El resto de la app funciona con normalidad.'}
        </p>
      </div>

      {/* Selection Controls */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Seleccionar Sesión</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Event Selection */}
          <div>
            <label
              htmlFor="analysis-event"
              className="mb-2 block text-sm font-medium text-muted-foreground"
            >
              Gran Premio
            </label>
            <select
              id="analysis-event"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            <label
              htmlFor="analysis-session"
              className="mb-2 block text-sm font-medium text-muted-foreground"
            >
              Sesión
            </label>
            <select
              id="analysis-session"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            <label
              htmlFor="analysis-driver-1"
              className="mb-2 block text-sm font-medium text-muted-foreground"
            >
              Piloto 1
            </label>
            <select
              id="analysis-driver-1"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            <label
              htmlFor="analysis-driver-2"
              className="mb-2 block text-sm font-medium text-muted-foreground"
            >
              Piloto 2
            </label>
            <select
              id="analysis-driver-2"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

          <Button
            onClick={fetchTrackMap}
            disabled={isAnyLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {loading.track ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MapaIcono className="h-4 w-4" aria-hidden />
            )}
            Trazado de {driver1}
          </Button>

          <Button
            onClick={fetchStints}
            disabled={isAnyLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {loading.stints ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Layers className="h-4 w-4" aria-hidden />
            )}
            Estrategia de neumáticos
          </Button>

          <Button
            onClick={fetchRaceProgress}
            disabled={isAnyLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {loading.race ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <TrendingUp className="h-4 w-4" aria-hidden />
            )}
            Carrera vuelta a vuelta
          </Button>

          <Button
            onClick={fetchWeather}
            disabled={isAnyLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {loading.weather ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <CloudSun className="h-4 w-4" aria-hidden />
            )}
            Condiciones
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
          >
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
                <span className="flex items-center gap-2 rounded bg-muted px-3 py-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-border"
                    style={{ backgroundColor: compoundColor(telemetry.compound) }}
                  />
                  {telemetry.compound}
                </span>
              )}
              {telemetry.is_personal_best && (
                <span className="rounded bg-personal-best/10 px-3 py-1 text-personal-best">
                  Personal Best
                </span>
              )}
            </div>
            <TelemetryChart
              cursor={cursorVuelta}
              onCursor={setCursorVuelta}
              traces={[
                {
                  driver: telemetry.driver,
                  constructorId: teamOf(telemetry.driver),
                  distance: telemetry.telemetry.map((point) => point.Distance ?? 0),
                  speed: telemetry.telemetry.map((point) => point.Speed ?? 0),
                  throttle: telemetry.telemetry.map((point) => point.Throttle ?? 0),
                  brake: telemetry.telemetry.map((point) => point.Brake ?? 0),
                } satisfies TelemetryTrace,
              ]}
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
            <TelemetryChart
              traces={[comparison.driver1, comparison.driver2].map((entry) => ({
                driver: entry.code,
                constructorId: teamOf(entry.code),
                distance: entry.telemetry.map((point) => point.Distance ?? 0),
                speed: entry.telemetry.map((point) => point.Speed ?? 0),
                throttle: entry.telemetry.map((point) => point.Throttle ?? 0),
                brake: entry.telemetry.map((point) => point.Brake ?? 0),
              }))}
            />
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

        {/* Trazado coloreado por velocidad */}
        {trackMap && (
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <MapaIcono className="h-5 w-5 text-primary" aria-hidden />
              Trazado - {trackMap.driver}
              {trackMap.lap_time && (
                <span className="font-mono text-base font-normal text-muted-foreground">
                  {trackMap.lap_time}
                </span>
              )}
            </h2>
            {mismoPiloto && (
              <p className="mb-3 text-sm text-muted-foreground">
                Pasa el dedo o el cursor por el mapa o por las trazas: las dos cosas señalan el
                mismo punto de la vuelta.
              </p>
            )}
            <div className="rounded-lg border border-border bg-card p-4">
              <TrackMap
                // Solo se sincronizan si las dos cosas son del mismo piloto:
                // se puede cambiar de piloto y cargar el trazado sin recargar
                // las trazas, y entonces los dos lienzos señalaban puntos de
                // vueltas distintas. El aviso de arriba ya lo comprobaba; el
                // cableado, no.
                cursor={mismoPiloto ? cursorVuelta : null}
                onCursor={mismoPiloto ? setCursorVuelta : undefined}
                points={trackMap.points}
                rotation={trackMap.rotation}
                minSpeed={trackMap.min_speed}
                maxSpeed={trackMap.max_speed}
                driver={trackMap.driver}
                lapTime={trackMap.lap_time}
              />
            </div>
          </div>
        )}

        {/* Condiciones de la sesión */}
        {weather && <SessionWeather data={weather} />}

        {/* Cómo se desarrolló la carrera */}
        {raceLaps && (
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
              Carrera vuelta a vuelta - {raceLaps.session.name}
            </h2>
            <div className="rounded-lg border border-border bg-card p-4">
              <RaceProgress laps={raceLaps.laps} teamOf={teamOf} />
            </div>
          </div>
        )}

        {/* Constancia: cada vuelta, un punto */}
        {raceLaps && (
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <ScatterChart className="h-5 w-5 text-primary" aria-hidden />
              Constancia vuelta a vuelta
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Cada punto es una vuelta. Una nube apretada es un piloto repitiendo ritmo; una
              dispersa, tráfico o neumáticos cayéndose. Los escalones hacia abajo son juegos
              nuevos. Se destacan {driver1} y {driver2}.
            </p>
            <div className="rounded-lg border border-border bg-card p-4">
              <LapScatter
                laps={raceLaps.laps}
                destacados={[driver1, driver2]}
                teamOf={teamOf}
              />
            </div>
          </div>
        )}

        {/* Ritmo de toda la parrilla */}
        {raceLaps && (
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
              Ritmo de la parrilla
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Ordenados por su mediana, que es el ritmo que de verdad sostuvieron — no por la
              vuelta rápida, que la marca cualquiera con el coche vacío. Suele no coincidir con el
              orden de llegada.
            </p>
            <div className="rounded-lg border border-border bg-card p-4">
              <PaceBoxes laps={raceLaps.laps} teamOf={teamOf} />
            </div>
          </div>
        )}

        {/* Estrategia de neumáticos */}
        {stints && (
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <Layers className="h-5 w-5 text-primary" aria-hidden />
              Estrategia de neumáticos
            </h2>
            <div className="rounded-lg border border-border bg-card p-4">
              <StintChart drivers={stints.drivers} totalLaps={stints.total_laps} />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!telemetry &&
          !comparison &&
          !fastestLaps &&
          !trackMap &&
          !stints &&
          !raceLaps &&
          !weather && (
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
