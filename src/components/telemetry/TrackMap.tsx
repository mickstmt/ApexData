'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import type { TrackPoint } from '@/types';

/**
 * Trazado del circuito coloreado por velocidad.
 *
 * El pendiente del Sprint 4. La forma sale de la posición del coche vuelta a
 * vuelta y el color, de la velocidad en cada punto: dónde se frena y dónde se
 * va a fondo se lee de un vistazo, sin números.
 *
 * En canvas y no en SVG por la misma razón que las trazas de telemetría: son
 * cientos de segmentos con su propio color, y un `<path>` por segmento es un
 * nodo por segmento.
 *
 * La escala de color va de un azul frío a un amarillo cálido —no del rojo al
 * verde—, para que quien no distingue esos dos siga leyendo el gradiente: la
 * luminosidad sube con la velocidad, así que el orden se percibe igual en
 * escala de grises.
 */

const PADDING = 18;

export function TrackMap({
  points,
  rotation,
  minSpeed,
  maxSpeed,
  driver,
  lapTime,
}: {
  points: TrackPoint[];
  rotation: number;
  minSpeed: number;
  maxSpeed: number;
  driver: string;
  lapTime: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 360 });

  /** Coordenadas ya giradas: FastF1 las graba en la orientación del GPS. */
  const rotated = useMemo(() => {
    const radianes = (rotation * Math.PI) / 180;
    const cos = Math.cos(radianes);
    const sin = Math.sin(radianes);

    return points.map((point) => ({
      x: point.x * cos - point.y * sin,
      y: point.x * sin + point.y * cos,
      speed: point.speed,
    }));
  }, [points, rotation]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper || rotated.length < 2) return;

    const width = wrapper.clientWidth;
    const height = size.height;
    const ratio = window.devicePixelRatio || 1;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const xs = rotated.map((p) => p.x);
    const ys = rotated.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Una sola escala para los dos ejes: con dos, el circuito sale deformado.
    const escala = Math.min(
      (width - PADDING * 2) / (maxX - minX || 1),
      (height - PADDING * 2) / (maxY - minY || 1)
    );

    const desplazamientoX = (width - (maxX - minX) * escala) / 2;
    const desplazamientoY = (height - (maxY - minY) * escala) / 2;

    const px = (x: number) => (x - minX) * escala + desplazamientoX;
    // El eje Y del lienzo crece hacia abajo y el del circuito hacia arriba.
    const py = (y: number) => height - ((y - minY) * escala + desplazamientoY);

    const rango = Math.max(1, maxSpeed - minSpeed);
    const oscuro = resolvedTheme
      ? resolvedTheme === 'dark'
      : document.documentElement.classList.contains('dark');

    ctx.lineWidth = Math.max(3, Math.min(7, width / 90));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < rotated.length; i++) {
      const anterior = rotated[i - 1];
      const actual = rotated[i];
      const proporcion = (actual.speed - minSpeed) / rango;

      ctx.strokeStyle = colorPorVelocidad(proporcion, oscuro);
      ctx.beginPath();
      ctx.moveTo(px(anterior.x), py(anterior.y));
      ctx.lineTo(px(actual.x), py(actual.y));
      ctx.stroke();
    }
  }, [rotated, size.height, minSpeed, maxSpeed, resolvedTheme]);

  useEffect(() => {
    draw();
    const observer = new ResizeObserver(draw);
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    const alRedimensionar = () => setSize({ width: 0, height: window.innerWidth < 640 ? 280 : 360 });
    alRedimensionar();
    window.addEventListener('resize', alRedimensionar);
    return () => window.removeEventListener('resize', alRedimensionar);
  }, []);

  return (
    <figure className="m-0">
      <div ref={wrapperRef} className="w-full">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Trazado del circuito coloreado por velocidad, vuelta de ${driver}${
            lapTime ? ` en ${lapTime}` : ''
          }. De ${Math.round(minSpeed)} a ${Math.round(maxSpeed)} km/h.`}
        />
      </div>

      <figcaption className="mt-2 flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{Math.round(minSpeed)} km/h</span>
        <span
          aria-hidden
          className="h-2 flex-1 rounded-full"
          style={{ background: `linear-gradient(to right, ${escalaCss()})` }}
        />
        <span className="font-mono tabular-nums">{Math.round(maxSpeed)} km/h</span>
      </figcaption>
    </figure>
  );
}

/**
 * Azul frío → cian → amarillo cálido. La luminosidad crece con la velocidad,
 * así que el gradiente se sigue leyendo sin distinguir los colores.
 */
function colorPorVelocidad(proporcion: number, oscuro: boolean): string {
  const t = Math.min(1, Math.max(0, proporcion));
  const tono = 240 - t * 190;
  const luz = oscuro ? 38 + t * 30 : 30 + t * 22;

  return `hsl(${tono} 85% ${luz}%)`;
}

function escalaCss(): string {
  return [0, 0.25, 0.5, 0.75, 1]
    .map((t) => `hsl(${240 - t * 190} 85% 48%)`)
    .join(', ');
}
