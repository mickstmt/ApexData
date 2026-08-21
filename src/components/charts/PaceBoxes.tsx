'use client';

import { useMemo, useState } from 'react';
import { teamColor } from '@/lib/team-colors';
import { comoTiempo, prepararDispersion, resumirTodos } from '@/lib/lap-scatter';
import type { LapData } from '@/types';

/**
 * El ritmo de toda la parrilla, en cajas.
 *
 * La dispersión de puntos compara a dos pilotos con detalle; esta compara a los
 * veinte de un vistazo. Cada caja es la mitad central de las vueltas de alguien
 * —del primer al tercer cuartil—, la línea de dentro su mediana, y los bigotes
 * llegan al 5 % y al 95 %, o sea que el 90 % central de sus vueltas cabe entre
 * las dos puntas.
 *
 * **Ordenadas por mediana, no por mejor vuelta.** Esa es la decisión que hace
 * útil la lista: la vuelta rápida la marca cualquiera con el coche vacío y la
 * pista limpia; la mediana es el ritmo que de verdad se sostuvo. Es habitual que
 * el orden no coincida con el resultado de la carrera, y ahí está la gracia.
 *
 * En SVG y no en lienzo, al revés que la dispersión: son veinte cajas, no mil
 * puntos, y en SVG cada una lleva su descripción accesible sin trabajo extra.
 */

const FILA = 22;
const MARGEN = { arriba: 26, derecha: 16, abajo: 8, izquierda: 46 };

export function PaceBoxes({
  laps,
  teamOf,
}: {
  laps: LapData[];
  teamOf: (code: string) => string | null;
}) {
  const [senalado, setSenalado] = useState<string | null>(null);

  const { resumenes, suelo, techo } = useMemo(() => {
    const datos = prepararDispersion(laps);
    const resumenes = resumirTodos(datos.visibles);

    if (resumenes.length === 0) return { resumenes, suelo: 0, techo: 0 };

    // La escala se ajusta a lo que hay, no al corte del 110 %: si nadie llega
    // al techo, dejar ese hueco encogería todas las cajas contra el borde.
    const minimo = Math.min(...resumenes.map((r) => r.p5));
    const maximo = Math.max(...resumenes.map((r) => r.p95));
    const margen = (maximo - minimo) * 0.06;

    return { resumenes, suelo: minimo - margen, techo: maximo + margen };
  }, [laps]);

  if (resumenes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta sesión no trae vueltas suficientes para comparar ritmos.
      </p>
    );
  }

  const alto = MARGEN.arriba + resumenes.length * FILA + MARGEN.abajo;
  const ancho = 880;
  const px = (ms: number) =>
    MARGEN.izquierda +
    ((ms - suelo) / Math.max(1, techo - suelo)) * (ancho - MARGEN.izquierda - MARGEN.derecha);

  const referencia = resumenes[0].mediana;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="w-full"
        style={{ height: alto }}
        role="img"
        aria-label={`Ritmo de ${resumenes.length} pilotos, del más rápido al más lento por mediana. Manda ${resumenes[0].code} con ${comoTiempo(resumenes[0].mediana)}.`}
      >
        {/* Guías: la mediana del más rápido y medio segundo por debajo. */}
        {[0, 500, 1000, 1500, 2000].map((offset) => {
          const ms = referencia + offset;
          if (ms > techo) return null;

          return (
            <g key={offset}>
              <line
                x1={px(ms)}
                x2={px(ms)}
                y1={MARGEN.arriba - 8}
                y2={alto - MARGEN.abajo}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={px(ms)}
                y={MARGEN.arriba - 14}
                textAnchor="middle"
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {offset === 0 ? comoTiempo(ms) : `+${(offset / 1000).toFixed(1)}s`}
              </text>
            </g>
          );
        })}

        {resumenes.map((resumen, indice) => {
          const y = MARGEN.arriba + indice * FILA + FILA / 2;
          const color = teamColor(teamOf(resumen.code)).color;
          const activo = senalado === resumen.code;

          return (
            <g
              key={resumen.code}
              onPointerEnter={() => setSenalado(resumen.code)}
              onPointerLeave={() => setSenalado(null)}
              className="cursor-default"
            >
              {/* Franja invisible: el objetivo de puntero es la fila entera, no
                  la caja, que puede medir veinte píxeles. */}
              <rect
                x={0}
                y={MARGEN.arriba + indice * FILA}
                width={ancho}
                height={FILA}
                fill="transparent"
              />

              <text
                x={MARGEN.izquierda - 8}
                y={y + 3}
                textAnchor="end"
                className={`fill-foreground font-mono text-[11px] ${activo ? 'font-bold' : ''}`}
              >
                {resumen.code}
              </text>

              {/* Bigotes: del 5 % al 95 % de sus vueltas. */}
              <line
                x1={px(resumen.p5)}
                x2={px(resumen.p95)}
                y1={y}
                y2={y}
                stroke={color}
                strokeWidth={1.5}
                opacity={0.55}
              />

              {/* La caja: la mitad central. */}
              <rect
                x={px(resumen.q1)}
                y={y - 6}
                width={Math.max(2, px(resumen.q3) - px(resumen.q1))}
                height={12}
                rx={3}
                fill={color}
                opacity={activo ? 0.55 : 0.34}
                stroke={color}
                strokeWidth={activo ? 1.5 : 1}
              />

              {/* La mediana: la línea que de verdad se compara. */}
              <line
                x1={px(resumen.mediana)}
                x2={px(resumen.mediana)}
                y1={y - 7}
                y2={y + 7}
                stroke={color}
                strokeWidth={2.5}
                strokeLinecap="round"
              />

              <title>
                {`${resumen.code}: mediana ${comoTiempo(resumen.mediana)}, mitad central de ${comoTiempo(resumen.q1)} a ${comoTiempo(resumen.q3)}, sobre ${resumen.vueltas} vueltas`}
              </title>
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          La caja es la mitad central de sus vueltas; la línea, la mediana; los bigotes, del 5 % al
          95 %. Ordenados por mediana.
        </span>

        {senalado && (
          <span className="ml-auto font-mono tabular-nums text-foreground">
            {(() => {
              const r = resumenes.find((x) => x.code === senalado)!;
              return `${r.code} · mediana ${comoTiempo(r.mediana)} · horquilla ${(r.intercuartil / 1000).toFixed(3)} s · ${r.vueltas} vueltas`;
            })()}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
