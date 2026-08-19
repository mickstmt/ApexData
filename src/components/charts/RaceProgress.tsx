'use client';

import { useMemo, useState } from 'react';
import { teamColor } from '@/lib/team-colors';
import { lapTimeToMs } from '@/lib/lap-times';
import type { LapData } from '@/types';

/**
 * Los dos gráficos que cuentan una carrera entera de un vistazo.
 *
 * **Posiciones vuelta a vuelta**: los cruces son adelantamientos y las caídas
 * en bloque, tandas de paradas.
 *
 * **Traza de carrera**: la distancia real al ganador en cada vuelta. La primera
 * versión usaba el ritmo mediano del ganador como referencia y salía ilegible
 * —todas las líneas caían a la vez, porque con depósito lleno las primeras
 * vueltas son más lentas que la mediana—. Contra el líder, su línea queda plana
 * en cero y lo que se ve es la distancia de verdad.
 *
 * Van en SVG y no en canvas, al revés que las trazas de telemetría: aquí son
 * veinte líneas de sesenta puntos, no miles de muestras, y en SVG cada serie
 * puede llevar su etiqueta y su descripción accesible.
 */

const CAJA = { alto: 360, ancho: 880 };
const MARGEN = { arriba: 16, derecha: 76, abajo: 30, izquierda: 48 };

/** Cuántos pilotos entran sin que el gráfico se vuelva una maraña. */
const MAX_PILOTOS = 10;

interface Serie {
  code: string;
  constructorId: string | null;
  posiciones: (number | null)[];
  /** Tiempo acumulado en cada vuelta, en milisegundos. */
  acumulado: (number | null)[];
}

export function RaceProgress({
  laps,
  teamOf,
}: {
  laps: LapData[];
  teamOf: (code: string) => string | null;
}) {
  const [vista, setVista] = useState<'posiciones' | 'traza'>('posiciones');

  const { series, totalVueltas } = useMemo(() => {
    const total = laps.reduce((max, lap) => Math.max(max, lap.LapNumber ?? 0), 0);
    const porPiloto = new Map<string, Serie>();

    for (const lap of laps) {
      if (!lap.Driver || !lap.LapNumber) continue;

      let serie = porPiloto.get(lap.Driver);
      if (!serie) {
        serie = {
          code: lap.Driver,
          constructorId: teamOf(lap.Driver),
          posiciones: Array(total).fill(null),
          acumulado: Array(total).fill(null),
        };
        porPiloto.set(lap.Driver, serie);
      }

      const indice = lap.LapNumber - 1;
      if (indice < total && lap.Position) serie.posiciones[indice] = Math.round(lap.Position);
      if (indice < total) {
        const ms = lapTimeToMs(lap.LapTime);
        const previo = indice > 0 ? serie.acumulado[indice - 1] : 0;
        serie.acumulado[indice] = ms !== null && previo !== null ? previo + ms : null;
      }
    }

    // El orden final manda: es como se lee una clasificación.
    const ordenadas = [...porPiloto.values()]
      .sort((a, b) => (a.posiciones[total - 1] ?? 99) - (b.posiciones[total - 1] ?? 99))
      .slice(0, MAX_PILOTOS);

    return { series: ordenadas, totalVueltas: total };
  }, [laps, teamOf]);

  if (series.length === 0 || totalVueltas < 2) return null;

  const hayPosiciones = series.some((s) => s.posiciones.some((p) => p !== null));

  return (
    <figure className="m-0">
      <div className="mb-3 flex flex-wrap items-center gap-2" role="tablist" aria-label="Vista del gráfico">
        {(
          [
            ['posiciones', 'Posiciones'],
            ['traza', 'Distancia al líder'],
          ] as const
        ).map(([id, etiqueta]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={vista === id}
            disabled={id === 'posiciones' && !hayPosiciones}
            onClick={() => setVista(id)}
            className={`min-h-11 rounded-lg border px-3 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 md:min-h-0 md:py-2 ${
              vista === id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input text-muted-foreground hover:text-foreground'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        {vista === 'posiciones' ? (
          <GraficoPosiciones series={series} totalVueltas={totalVueltas} />
        ) : (
          <GraficoTraza series={series} totalVueltas={totalVueltas} />
        )}
      </div>

      <details className="mt-3 border-t border-border pt-2">
        <summary className="cursor-pointer text-sm font-medium text-primary">
          Cómo se lee este gráfico
        </summary>
        {vista === 'posiciones' ? (
          <p className="mt-2 max-w-[64ch] text-sm text-muted-foreground">
            El eje vertical es la posición, con el primero arriba. Una línea que cae de golpe es
            una parada en boxes; si vuelve a subir en las vueltas siguientes, la parada salió
            bien. Dos líneas que se cruzan son un adelantamiento — y cuando varias caen a la vez,
            suele ser una tanda de paradas y no una avalancha de adelantamientos.
          </p>
        ) : (
          <p className="mt-2 max-w-[64ch] text-sm text-muted-foreground">
            La referencia es el ganador, así que su línea es la recta de arriba, en cero. Cada
            otra línea es la distancia real a él en segundos: cuanto más abajo, más lejos. El
            escalón brusco es una parada en boxes —unos veinte segundos— y lo interesante es la
            pendiente <em>después</em>: si la línea vuelve a acercarse, el neumático nuevo
            compensó lo que costó ponérselo.
          </p>
        )}
      </details>
    </figure>
  );
}

function GraficoPosiciones({ series, totalVueltas }: { series: Serie[]; totalVueltas: number }) {
  const maxPos = Math.max(
    2,
    ...series.map((s) => Math.max(...s.posiciones.map((p) => p ?? 0)))
  );

  const x = (vuelta: number) =>
    MARGEN.izquierda +
    ((CAJA.ancho - MARGEN.izquierda - MARGEN.derecha) * (vuelta - 1)) / (totalVueltas - 1);
  const y = (pos: number) =>
    MARGEN.arriba + ((CAJA.alto - MARGEN.arriba - MARGEN.abajo) * (pos - 1)) / (maxPos - 1);

  const etiquetas = repartir(
    series
      .map((s) => {
        const ultima = [...s.posiciones].reverse().find((p) => p !== null);
        return ultima ? { code: s.code, constructorId: s.constructorId, y: y(ultima) } : null;
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)
  );

  return (
    <Lienzo etiqueta={`Posiciones vuelta a vuelta de los ${series.length} primeros`}>
      {[1, ...rango(4, maxPos)].map((pos) => (
        <g key={pos}>
          <line
            x1={MARGEN.izquierda}
            x2={CAJA.ancho - MARGEN.derecha}
            y1={y(pos)}
            y2={y(pos)}
            className="stroke-border"
            strokeWidth={1}
          />
          <text
            x={MARGEN.izquierda - 8}
            y={y(pos) + 3}
            textAnchor="end"
            className="fill-muted-foreground font-mono text-[10px]"
          >
            P{pos}
          </text>
        </g>
      ))}

      <EjeVueltas totalVueltas={totalVueltas} x={x} />

      {series.map((serie) => {
        const puntos = serie.posiciones
          .map((pos, indice) => (pos ? `${x(indice + 1)},${y(pos)}` : null))
          .filter(Boolean)
          .join(' ');

        return puntos ? (
          <polyline
            key={serie.code}
            points={puntos}
            fill="none"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            className="team-ink"
            style={tinta(serie.constructorId)}
            stroke="currentColor"
          />
        ) : null;
      })}

      <Etiquetas etiquetas={etiquetas} />
    </Lienzo>
  );
}

function GraficoTraza({ series, totalVueltas }: { series: Serie[]; totalVueltas: number }) {
  const lider = series[0];

  const deltas = series.map((serie) => ({
    serie,
    puntos: serie.acumulado
      .map((ms, indice) => {
        const referencia = lider.acumulado[indice];
        return ms !== null && referencia !== null
          ? { vuelta: indice + 1, segundos: (ms - referencia) / 1000 }
          : null;
      })
      .filter((p): p is { vuelta: number; segundos: number } => p !== null),
  }));

  const todos = deltas.flatMap((d) => d.puntos.map((p) => p.segundos));
  if (todos.length === 0) return null;

  const min = Math.min(...todos);
  const max = Math.max(...todos);

  const x = (vuelta: number) =>
    MARGEN.izquierda +
    ((CAJA.ancho - MARGEN.izquierda - MARGEN.derecha) * (vuelta - 1)) / (totalVueltas - 1);
  const y = (segundos: number) =>
    MARGEN.arriba + ((CAJA.alto - MARGEN.arriba - MARGEN.abajo) * (segundos - min)) / (max - min || 1);

  const etiquetas = repartir(
    deltas
      .map(({ serie, puntos }) => {
        const fin = puntos[puntos.length - 1];
        return fin ? { code: serie.code, constructorId: serie.constructorId, y: y(fin.segundos) } : null;
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)
  );

  return (
    <Lienzo etiqueta="Distancia al líder vuelta a vuelta, en segundos">
      {[0, 1, 2, 3, 4].map((paso) => {
        const valor = min + ((max - min) * paso) / 4;
        return (
          <g key={paso}>
            <line
              x1={MARGEN.izquierda}
              x2={CAJA.ancho - MARGEN.derecha}
              y1={y(valor)}
              y2={y(valor)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={MARGEN.izquierda - 8}
              y={y(valor) + 3}
              textAnchor="end"
              className="fill-muted-foreground font-mono text-[10px]"
            >
              {valor > 0 ? '+' : ''}
              {Math.round(valor)}s
            </text>
          </g>
        );
      })}

      <EjeVueltas totalVueltas={totalVueltas} x={x} />

      {deltas.map(({ serie, puntos }) => (
        <polyline
          key={serie.code}
          points={puntos.map((p) => `${x(p.vuelta)},${y(p.segundos)}`).join(' ')}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="team-ink"
          style={tinta(serie.constructorId)}
          stroke="currentColor"
        />
      ))}

      <Etiquetas etiquetas={etiquetas} />
    </Lienzo>
  );
}

function Lienzo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${CAJA.ancho} ${CAJA.alto}`}
      className="h-auto w-full min-w-[640px] touch-pan-x touch-pan-y"
      role="img"
      aria-label={etiqueta}
    >
      {children}
    </svg>
  );
}

function EjeVueltas({ totalVueltas, x }: { totalVueltas: number; x: (v: number) => number }) {
  const marcas = [1, ...rango(Math.max(1, Math.round(totalVueltas / 4)), totalVueltas)];

  return (
    <>
      {marcas.map((vuelta) => (
        <text
          key={vuelta}
          x={x(vuelta)}
          y={CAJA.alto - 10}
          textAnchor="middle"
          className="fill-muted-foreground font-mono text-[10px]"
        >
          V{vuelta}
        </text>
      ))}
    </>
  );
}

/**
 * Etiqueta directa al final de cada línea, como en el gráfico del campeonato:
 * el nombre queda donde ya está el ojo, y no hace falta una caja de leyenda.
 */
function Etiquetas({
  etiquetas,
}: {
  etiquetas: { code: string; constructorId: string | null; y: number }[];
}) {
  return (
    <>
      {etiquetas.map((e) => (
        <text
          key={e.code}
          x={CAJA.ancho - MARGEN.derecha + 8}
          y={e.y + 4}
          className="team-ink text-[11px] font-semibold"
          style={tinta(e.constructorId)}
          fill="currentColor"
        >
          {e.code}
        </text>
      ))}
    </>
  );
}

/** Ambas variantes del color de equipo, para que el tema elija sin JavaScript. */
function tinta(constructorId: string | null): React.CSSProperties {
  const { onDark, onLight } = teamColor(constructorId);
  return { '--team-on-dark': onDark, '--team-on-light': onLight } as React.CSSProperties;
}

/**
 * Separa las etiquetas que caerían encima unas de otras.
 *
 * Con diez pilotos, varios terminan a segundos de distancia y sus etiquetas se
 * pisaban hasta ser ilegibles. Se respeta el orden y solo se empuja hacia abajo.
 */
function repartir<T extends { y: number }>(etiquetas: T[], minimo = 13): T[] {
  // El empujón tiene que encadenarse: si se compara contra el array original
  // en vez de contra la etiqueta ya movida, dos que caen juntas se separan de
  // la primera pero no entre sí. Medido: quedaban a 5 px de los 13 pedidos.
  const repartidas: T[] = [];

  for (const etiqueta of [...etiquetas].sort((a, b) => a.y - b.y)) {
    const anterior = repartidas[repartidas.length - 1];
    const y = anterior ? Math.max(etiqueta.y, anterior.y + minimo) : etiqueta.y;
    repartidas.push({ ...etiqueta, y });
  }

  return repartidas;
}

function rango(paso: number, hasta: number): number[] {
  const valores: number[] = [];
  for (let valor = paso; valor <= hasta; valor += paso) valores.push(valor);
  return valores;
}
