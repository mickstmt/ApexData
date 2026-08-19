'use client';

import { CloudRain, CloudSun, Droplets, Gauge, Thermometer, Wind } from 'lucide-react';
import type { SessionWeatherResponse } from '@/types';

/**
 * Condiciones de la sesión.
 *
 * Es lo que enseñaba la retirada `/telemetry` —temperatura, humedad, viento—
 * con dos diferencias que justifican el cambio: viene de FastF1 y no de OpenF1,
 * así que es **de la sesión que el usuario ha elegido** y no de «la última que
 * hubiera»; y aprovecha un endpoint que el servicio tenía desde el principio y
 * que ninguna pantalla usaba.
 *
 * Se resume en promedios porque una sesión trae una muestra por minuto y aquí
 * la pregunta es «cómo estaba la pista», no la serie temporal. La lluvia es la
 * excepción: se dice si llovió **en algún momento**, porque un promedio de un
 * booleano no significa nada y una sesión mixta es justo la que hay que contar.
 */

export function SessionWeather({ data }: { data: SessionWeatherResponse }) {
  const muestras = data.weather_data;
  if (muestras.length === 0) return null;

  const media = (leer: (m: (typeof muestras)[number]) => number) => {
    const valores = muestras.map(leer).filter((v) => typeof v === 'number' && !Number.isNaN(v));
    if (valores.length === 0) return null;
    return valores.reduce((suma, v) => suma + v, 0) / valores.length;
  };

  const llovio = muestras.some((m) => m.Rainfall);

  const datos = [
    { icono: Thermometer, etiqueta: 'Aire', valor: media((m) => m.AirTemp), unidad: '°C' },
    { icono: Gauge, etiqueta: 'Pista', valor: media((m) => m.TrackTemp), unidad: '°C' },
    { icono: Droplets, etiqueta: 'Humedad', valor: media((m) => m.Humidity), unidad: '%' },
    { icono: Wind, etiqueta: 'Viento', valor: media((m) => m.WindSpeed), unidad: ' m/s' },
  ].filter((d) => d.valor !== null);

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
        <CloudSun className="h-5 w-5 text-primary" aria-hidden />
        Condiciones - {data.session.name}
      </h2>

      <div className="rounded-lg border border-border bg-card p-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {datos.map(({ icono: Icono, etiqueta, valor, unidad }) => (
            <div key={etiqueta}>
              <dt className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <Icono className="h-3.5 w-3.5" aria-hidden />
                {etiqueta}
              </dt>
              <dd className="m-0 font-mono text-2xl font-bold tabular-nums">
                {valor!.toFixed(1)}
                <span className="text-base font-normal text-muted-foreground">{unidad}</span>
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
          <CloudRain className="h-4 w-4 shrink-0" aria-hidden />
          {llovio
            ? 'Llovió en algún momento de la sesión.'
            : 'Sesión en seco de principio a fin.'}
          <span className="ml-auto shrink-0 text-xs">
            Promedio de {muestras.length} mediciones
          </span>
        </p>
      </div>
    </div>
  );
}
