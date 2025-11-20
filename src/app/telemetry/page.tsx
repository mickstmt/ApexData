import { Zap, Calendar, Users, TrendingUp } from 'lucide-react';
import { getLatestSession, getSessionSummary } from '@/services/openf1/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Telemetría en Tiempo Real | ApexData',
  description: 'Datos de telemetría y análisis en tiempo real de Fórmula 1',
};

export default async function TelemetryPage() {
  let session = null;
  let sessionData = null;
  let error = null;

  try {
    session = await getLatestSession();
    if (session) {
      sessionData = await getSessionSummary(session.session_key);
    }
  } catch (err) {
    console.error('Error loading telemetry data:', err);
    error = err;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <Zap className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold md:text-5xl">
            Telemetría <span className="text-primary">en Vivo</span>
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Datos en tiempo real y análisis de telemetría desde OpenF1 API
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          📊 Datos disponibles desde la temporada 2023
        </p>
      </div>

      {/* Latest Session Info */}
      {session && sessionData ? (
        <div className="space-y-8">
          {/* Session Card */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="mb-2 text-2xl font-bold">
                  {sessionData.session.session_name}
                </h2>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(session.date_start).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <div>
                    📍 {session.location}, {session.country_name}
                  </div>
                  <div>
                    🏁 {session.circuit_short_name}
                  </div>
                </div>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                {session.year}
              </span>
            </div>

            {/* Weather Info */}
            {sessionData.weather && (
              <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  Condiciones Meteorológicas
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Temp. Aire</div>
                    <div className="text-lg font-bold">
                      {sessionData.weather.air_temperature}°C
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Temp. Pista</div>
                    <div className="text-lg font-bold">
                      {sessionData.weather.track_temperature}°C
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Humedad</div>
                    <div className="text-lg font-bold">
                      {sessionData.weather.humidity}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Viento</div>
                    <div className="text-lg font-bold">
                      {sessionData.weather.wind_speed} m/s
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drivers Grid */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold">
                Pilotos Participantes ({sessionData.drivers.length})
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sessionData.drivers.map((driver) => (
                <div
                  key={driver.driver_number}
                  className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                      style={{
                        backgroundColor: `#${driver.team_colour}20`,
                        color: `#${driver.team_colour}`,
                      }}
                    >
                      {driver.driver_number}
                    </div>
                    <div className="text-xs font-bold text-muted-foreground">
                      {driver.name_acronym}
                    </div>
                  </div>
                  <div className="mb-1 font-bold">{driver.broadcast_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {driver.team_name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Race Control Messages */}
          {sessionData.raceControl.length > 0 && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-bold">Control de Carrera</h3>
              </div>

              <div className="space-y-2">
                {sessionData.raceControl.slice(0, 10).map((message, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">
                        {message.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {message.lap_number && `Vuelta ${message.lap_number}`}
                      </span>
                    </div>
                    <div className="text-sm">{message.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA for more features */}
          <div className="mt-12 rounded-lg border border-border bg-muted/50 p-8 text-center">
            <h3 className="mb-4 text-2xl font-bold">
              Más funciones de telemetría próximamente
            </h3>
            <p className="mb-6 text-muted-foreground">
              Gráficos interactivos de velocidad, comparación de vueltas, análisis de
              telemetría detallada y más.
            </p>
            <Link href="/drivers">
              <Button>Explorar Pilotos</Button>
            </Link>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-12 text-center">
          <div className="mb-4 text-6xl">⚠️</div>
          <h2 className="mb-4 text-2xl font-bold">Error al cargar datos</h2>
          <p className="text-muted-foreground">
            No se pudieron obtener los datos de telemetría. Por favor, intenta nuevamente
            más tarde.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <Zap className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-4 text-2xl font-bold">No hay datos disponibles</h2>
          <p className="text-muted-foreground">
            No se encontraron sesiones recientes. Los datos de telemetría están disponibles
            desde la temporada 2023.
          </p>
        </div>
      )}
    </div>
  );
}
