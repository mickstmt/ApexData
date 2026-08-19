'use client';

import { useId, useRef, useState } from 'react';
import { teamInk } from '@/lib/team-colors';

/**
 * Championship points, round by round.
 *
 * Colour follows the team, not the ranking, so a driver keeps their identity
 * as positions change. Team-mates share a colour by definition, so the second
 * one is dashed — the convention F1 broadcasts and FastF1 both use, and the
 * reason this chart does not need a colour per driver.
 */

export interface EvolutionSeries {
  driverId: string;
  name: string;
  constructorId: string | null;
  /** Cumulative points after each round, index 0 = round 1. */
  points: number[];
}

const PADDING = { top: 16, right: 96, bottom: 28, left: 40 };

export function PointsEvolution({
  series,
  rounds,
  height = 280,
}: {
  series: EvolutionSeries[];
  rounds: number;
  height?: number;
}) {
  const clipId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverRound, setHoverRound] = useState<number | null>(null);

  const width = 720;
  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;

  const maxPoints = Math.max(10, ...series.flatMap((s) => s.points));
  const x = (round: number) => PADDING.left + (plotWidth * (round - 1)) / Math.max(1, rounds - 1);
  const y = (points: number) => PADDING.top + plotHeight - (plotHeight * points) / maxPoints;

  // Team-mates get a dashed line so a shared colour is never ambiguous.
  const seenTeam = new Set<string>();
  const dashed = new Set<string>();
  for (const s of series) {
    const key = s.constructorId ?? s.driverId;
    if (seenTeam.has(key)) dashed.add(s.driverId);
    seenTeam.add(key);
  }

  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((maxPoints / 4) * i));

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const box = svg.getBoundingClientRect();
    const position = ((event.clientX - box.left) / box.width) * width;
    const round = Math.round(((position - PADDING.left) / plotWidth) * (rounds - 1)) + 1;

    setHoverRound(Math.min(rounds, Math.max(1, round)));
  };

  return (
    <figure className="m-0">
      {/* La alternativa textual del gráfico: `role="img"` con una etiqueta
          decía de qué iba, pero no qué contaba. Con la tabla, quien usa lector
          de pantalla lee los mismos números. */}
      <table className="sr-only">
        <caption>Puntos acumulados por ronda de los cinco primeros</caption>
        <thead>
          <tr>
            <th scope="col">Piloto</th>
            {Array.from({ length: rounds }, (_, index) => (
              <th key={index} scope="col">
                Ronda {index + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((s) => (
            <tr key={s.driverId}>
              <th scope="row">{s.name}</th>
              {Array.from({ length: rounds }, (_, index) => (
                <td key={index}>{s.points[index] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="overflow-x-auto" aria-hidden>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[560px] touch-pan-x touch-pan-y"
          role="img"
          aria-label="Evolución de puntos por ronda"
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverRound(null)}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={PADDING.left} y={PADDING.top} width={plotWidth} height={plotHeight} />
            </clipPath>
          </defs>

          {/* Recessive grid: present enough to read a value, quiet enough to ignore. */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={PADDING.left + plotWidth}
                y1={y(tick)}
                y2={y(tick)}
                stroke="currentColor"
                strokeWidth="1"
                className="text-border"
              />
              <text
                x={PADDING.left - 8}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {tick}
              </text>
            </g>
          ))}

          {[1, Math.ceil(rounds / 2), rounds].map((round) => (
            <text
              key={round}
              x={x(round)}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px] tabular-nums"
            >
              R{round}
            </text>
          ))}

          {hoverRound !== null && (
            <line
              x1={x(hoverRound)}
              x2={x(hoverRound)}
              y1={PADDING.top}
              y2={PADDING.top + plotHeight}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 3"
              className="text-muted-foreground"
            />
          )}

          <g clipPath={`url(#${clipId})`}>
            {series.map((s) => {
              const path = s.points
                .map((points, index) => `${index === 0 ? 'M' : 'L'} ${x(index + 1)} ${y(points)}`)
                .join(' ');

              return (
                <path
                  key={s.driverId}
                  d={path}
                  className="team-ink"
                  style={teamInk(s.constructorId)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={dashed.has(s.driverId) ? '6 4' : undefined}
                />
              );
            })}
          </g>

          {/* Direct labels at the line end beat a legend box: the name sits
              where the eye already is. */}
          {series.map((s) => {
            const last = s.points.length;

            return (
              <g key={s.driverId}>
                <circle
                  cx={x(last)}
                  cy={y(s.points[last - 1])}
                  r="3.5"
                  className="team-ink"
                  style={teamInk(s.constructorId)}
                  fill="currentColor"
                />
                <text
                  x={x(last) + 8}
                  y={y(s.points[last - 1])}
                  dominantBaseline="middle"
                  className="fill-foreground text-[11px] font-medium"
                >
                  {s.name}
                </text>
              </g>
            );
          })}

          {hoverRound !== null &&
            series.map((s) => {
              const value = s.points[hoverRound - 1];
              if (value === undefined) return null;

              return (
                <circle
                  key={s.driverId}
                  cx={x(hoverRound)}
                  cy={y(value)}
                  r="4"
                  className="team-ink"
                  style={teamInk(s.constructorId)}
                  fill="currentColor"
                  stroke="hsl(var(--card))"
                  strokeWidth="2"
                />
              );
            })}
        </svg>
      </div>

      {/* The readout sits outside the plot so a finger never covers it. */}
      <figcaption className="mt-2 flex min-h-[24px] flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {hoverRound === null ? (
          <span>Pasa el dedo o el cursor por el gráfico para ver cada ronda.</span>
        ) : (
          <>
            <span className="font-semibold text-foreground tabular-nums">Ronda {hoverRound}</span>
            {series.map((s) => (
              <span key={s.driverId} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="team-ink inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ ...teamInk(s.constructorId), backgroundColor: 'currentColor' }}
                />
                {s.name}
                <span className="font-mono tabular-nums text-foreground">
                  {s.points[hoverRound - 1] ?? '—'}
                </span>
              </span>
            ))}
          </>
        )}
      </figcaption>
    </figure>
  );
}
