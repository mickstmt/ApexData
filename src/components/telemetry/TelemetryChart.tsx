'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { teamColor, teamInk } from '@/lib/team-colors';

/**
 * Telemetry traces along a lap, drawn on canvas.
 *
 * A lap carries thousands of samples per channel, which is well past what SVG
 * can repaint at 60fps on a phone. Channels stack in one column and share a
 * single crosshair, so speed, throttle and brake are always read at the same
 * point on track — the thing that makes a trace worth looking at.
 *
 * The readout sits above the plot rather than following the finger, because a
 * tooltip under the thumb is covered by the thumb.
 */

export interface TelemetryTrace {
  driver: string;
  constructorId?: string | null;
  distance: number[];
  speed: number[];
  throttle?: number[];
  brake?: Array<number | boolean>;
}

interface Channel {
  key: 'speed' | 'throttle' | 'brake';
  label: string;
  unit: string;
  height: number;
  max?: number;
}

const CHANNELS: Channel[] = [
  { key: 'speed', label: 'Velocidad', unit: 'km/h', height: 150 },
  { key: 'throttle', label: 'Acelerador', unit: '%', height: 70, max: 100 },
  { key: 'brake', label: 'Freno', unit: '', height: 46, max: 1 },
];

const PADDING = { left: 44, right: 12, top: 10, bottom: 4 };

function readChannel(trace: TelemetryTrace, key: Channel['key']): number[] | null {
  if (key === 'speed') return trace.speed;
  if (key === 'throttle') return trace.throttle ?? null;
  // FastF1 reports brake as a boolean; normalise it to 0/1 so it plots.
  return trace.brake ? trace.brake.map((value) => (value ? 1 : 0)) : null;
}

export function TelemetryChart({
  traces,
  cursor: cursorExterno,
  onCursor,
}: {
  traces: TelemetryTrace[];
  /**
   * Metros de vuelta donde está el cursor, cuando lo gobierna alguien de fuera.
   *
   * Existe para que el mapa del circuito y estas trazas señalen el mismo punto:
   * mover el dedo aquí mueve el punto allí, y al revés. Sin esto hay que
   * relacionar a ojo una curva de la gráfica con un trozo de asfalto.
   */
  cursor?: number | null;
  onCursor?: (distancia: number | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [cursorPropio, setCursorPropio] = useState<number | null>(null);

  // Controlado si le pasan `onCursor`; si no, se gobierna solo. Así el
  // componente sigue sirviendo suelto, como hasta ahora.
  const controlado = onCursor !== undefined;
  const cursor = controlado ? cursorExterno ?? null : cursorPropio;
  const setCursor = (distancia: number | null) =>
    controlado ? onCursor(distancia) : setCursorPropio(distancia);
  // A canvas cannot inherit a CSS variable, so this is the one place that has
  // to read the theme in code — and to repaint when it changes.
  const { resolvedTheme } = useTheme();
  const paleta = useRef({ ink: '#8A8A94', grid: '#2A2A33' });

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    paleta.current = {
      ink: `hsl(${styles.getPropertyValue('--muted-foreground').trim()})`,
      grid: `hsl(${styles.getPropertyValue('--border').trim()})`,
    };
  }, [resolvedTheme]);

  const maxDistance = useMemo(
    () => Math.max(...traces.map((trace) => trace.distance[trace.distance.length - 1] ?? 0)),
    [traces]
  );

  const visibleChannels = useMemo(
    () => CHANNELS.filter((channel) => traces.some((trace) => readChannel(trace, channel.key))),
    [traces]
  );

  const totalHeight = visibleChannels.reduce((sum, c) => sum + c.height, 0) + PADDING.top + PADDING.bottom;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const width = wrapper.clientWidth;
    const ratio = window.devicePixelRatio || 1;

    canvas.width = width * ratio;
    canvas.height = totalHeight * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${totalHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, totalHeight);

    // `getComputedStyle` fuerza un recálculo de estilo, y `draw` corre en cada
    // `pointermove` mientras se arrastra el cursor: era el único punto del
    // código que provocaba reflow durante una interacción continua. Los
    // colores del tema se leen una vez, al cambiar de tema. Comprobar la clase
    // del documento, en cambio, no cuesta nada y mantiene el primer dibujo
    // correcto antes de que next-themes resuelva.
    const { ink, grid } = paleta.current;
    const isDark = resolvedTheme
      ? resolvedTheme === 'dark'
      : document.documentElement.classList.contains('dark');

    const plotWidth = width - PADDING.left - PADDING.right;
    const xOf = (distance: number) => PADDING.left + (plotWidth * distance) / maxDistance;

    let top = PADDING.top;

    for (const channel of visibleChannels) {
      const values = traces.flatMap((trace) => readChannel(trace, channel.key) ?? []);
      const max = channel.max ?? Math.ceil(Math.max(...values) / 20) * 20;
      const bottom = top + channel.height;

      // Baseline and ceiling only: a full grid competes with the trace.
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, bottom - 0.5);
      ctx.lineTo(width - PADDING.right, bottom - 0.5);
      ctx.stroke();

      ctx.fillStyle = ink;
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(String(max), PADDING.left - 6, top + 10);
      ctx.fillText('0', PADDING.left - 6, bottom - 2);

      ctx.textAlign = 'left';
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(channel.label.toUpperCase(), PADDING.left + 2, top + 10);

      for (const [index, trace] of traces.entries()) {
        const series = readChannel(trace, channel.key);
        if (!series) continue;

        const { onDark, onLight } = teamColor(trace.constructorId);
        ctx.strokeStyle = isDark ? onDark : onLight;
        ctx.lineWidth = 2;
        // Team-mates and same-colour cars stay apart via a dashed second line.
        ctx.setLineDash(index > 0 && traces[0].constructorId === trace.constructorId ? [6, 4] : []);
        ctx.beginPath();

        for (let i = 0; i < series.length; i++) {
          const x = xOf(trace.distance[i] ?? 0);
          const y = bottom - (series[i] / max) * (channel.height - 12);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();
        ctx.setLineDash([]);
      }

      top = bottom;
    }

    if (cursor !== null) {
      const x = xOf(cursor);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, PADDING.top);
      ctx.lineTo(x, totalHeight - PADDING.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [traces, cursor, maxDistance, totalHeight, visibleChannels, resolvedTheme]);

  useEffect(() => {
    draw();
    const observer = new ResizeObserver(draw);
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [draw]);

  const handlePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const box = wrapper.getBoundingClientRect();
    const plotWidth = box.width - PADDING.left - PADDING.right;
    const distance = ((event.clientX - box.left - PADDING.left) / plotWidth) * maxDistance;

    setCursor(Math.min(maxDistance, Math.max(0, distance)));
  };

  /** Nearest sample to the cursor, per trace. */
  const readout = traces.map((trace) => {
    if (cursor === null) return null;

    let index = 0;
    let best = Infinity;
    for (let i = 0; i < trace.distance.length; i++) {
      const delta = Math.abs(trace.distance[i] - cursor);
      if (delta < best) {
        best = delta;
        index = i;
      }
    }

    return {
      speed: Math.round(trace.speed[index] ?? 0),
      throttle: trace.throttle ? Math.round(trace.throttle[index]) : null,
      brake: trace.brake ? Boolean(trace.brake[index]) : null,
    };
  });

  return (
    <figure className="m-0">
      {/* Values live above the plot: under the finger they would be hidden. */}
      <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {traces.map((trace, index) => (
          <span key={trace.driver} className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="team-ink inline-block h-3 w-3 rounded-sm"
              style={{ ...teamInk(trace.constructorId), backgroundColor: 'currentColor' }}
            />
            <span className="font-medium">{trace.driver}</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {readout[index] ? `${readout[index]!.speed} km/h` : '—'}
            </span>
            {readout[index]?.brake && (
              <span className="rounded bg-destructive/15 px-1.5 text-[10px] font-semibold uppercase text-destructive">
                freno
              </span>
            )}
          </span>
        ))}
      </div>

      <div
        ref={wrapperRef}
        // touch-pan-y keeps vertical scrolling while horizontal drags scrub.
        className="relative w-full touch-pan-y select-none"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        // Al salir solo se borra si este gráfico va por libre. Compartiendo
        // cursor con el mapa, el `pointerleave` de aquí llegaba DESPUÉS del
        // `pointermove` de allí y borraba lo que el otro acababa de poner: el
        // punto no aparecía nunca al pasar de un gráfico al otro. Que el
        // marcador se quede donde lo dejaste es además lo que hace f1-tempo.
        onPointerLeave={controlado ? undefined : () => setCursor(null)}
      >
        <canvas ref={canvasRef} role="img" aria-label="Telemetría de la vuelta" />
      </div>

      <figcaption className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>Distancia de vuelta</span>
        <span className="font-mono tabular-nums">
          {cursor === null ? `${Math.round(maxDistance)} m` : `${Math.round(cursor)} m`}
        </span>
      </figcaption>
    </figure>
  );
}
