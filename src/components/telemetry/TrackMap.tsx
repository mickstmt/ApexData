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
 * La escala es de "calor" —frío para lento, cálido para rápido—, que es una de
 * las dos excepciones admitidas a la regla de "una sola tinta" para magnitud, y
 * va siempre acompañada de su leyenda con los extremos en km/h.
 *
 * Sus paradas **no se eligieron por buen aspecto, sino resolviendo una
 * luminancia objetivo por tono**. Escogidas a ojo con luminosidad HSL constante,
 * el amarillo quedaba a 1,61:1 sobre blanco y el azul a 1,53:1 sobre carbón: en
 * cada tema desaparecía un extremo de la escala, y eso no se ve mirando una sola
 * captura. Ahora el peor paso da 3,39:1 en claro y 3,53:1 en oscuro —el mínimo
 * que WCAG pide a un objeto gráfico— y la luminancia crece siempre, así que el
 * orden se percibe incluso en escala de grises.
 */

/** Paradas de la rampa, una lista por tema: la oscura no es la clara invertida. */
const RAMPA = {
  claro: ['#0D0DC7', '#085A7B', '#077545', '#1B8609', '#778809', '#E3670E'],
  oscuro: ['#5555F4', '#0E8FD4', '#0BB381', '#0DCC17', '#85D50E', '#F4CA4D'],
} as const;

const PADDING = 18;

export function TrackMap({
  points,
  rotation,
  minSpeed,
  maxSpeed,
  driver,
  lapTime,
  cursor,
  onCursor,
}: {
  points: TrackPoint[];
  rotation: number;
  minSpeed: number;
  maxSpeed: number;
  driver: string;
  lapTime: string | null;
  /** Metros de vuelta señalados por las trazas de telemetría, si las hay. */
  cursor?: number | null;
  onCursor?: (distancia: number | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /**
   * El marcador vive en su propia capa.
   *
   * Con un solo lienzo, cada movimiento del dedo obligaba a repintar los ~600
   * segmentos del trazado —y, como `draw` entraba en las dependencias del
   * efecto, a rehacer también el `ResizeObserver`—. Ahora el trazado solo se
   * redibuja si cambia el tamaño, el tema o la vuelta; el puntero únicamente
   * repinta este lienzo de encima, que tiene un círculo.
   */
  const marcadorRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 360 });
  const proyeccion = useRef<{ px: (x: number) => number; py: (y: number) => number } | null>(null);

  /** Coordenadas ya giradas: FastF1 las graba en la orientación del GPS. */
  const rotated = useMemo(() => {
    const radianes = (rotation * Math.PI) / 180;
    const cos = Math.cos(radianes);
    const sin = Math.sin(radianes);

    return points.map((point) => ({
      x: point.x * cos - point.y * sin,
      y: point.x * sin + point.y * cos,
      speed: point.speed,
      distance: point.distance,
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

    // Se guardan para que el puntero pueda traducir píxeles a distancia de
    // vuelta sin repetir el cálculo de escala.
    proyeccion.current = { px, py };

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

  /**
   * El punto que señalan las trazas, en la capa de encima. Lleva un anillo del
   * color del lienzo porque sobre una línea de siete píxeles con su propio
   * color, un punto a secas se confunde con el trazado.
   */
  const dibujarMarcador = useCallback(() => {
    const canvas = marcadorRef.current;
    const wrapper = wrapperRef.current;
    const proyectar = proyeccion.current;
    if (!canvas || !wrapper) return;

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

    const senalado = puntoEn(rotated, cursor);
    if (!senalado || !proyectar) return;

    const oscuro = resolvedTheme
      ? resolvedTheme === 'dark'
      : document.documentElement.classList.contains('dark');

    ctx.beginPath();
    ctx.arc(proyectar.px(senalado.x), proyectar.py(senalado.y), 7, 0, Math.PI * 2);
    ctx.fillStyle = oscuro ? '#F5F5F7' : '#15151A';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = oscuro ? '#0B0B0F' : '#FFFFFF';
    ctx.stroke();
  }, [rotated, size.height, cursor, resolvedTheme]);

  // El observador se monta una sola vez y lee siempre la última versión de
  // ambas funciones: si dependiera de ellas, se desconectaría y volvería a
  // conectarse en cada movimiento del puntero.
  const ultimoDibujo = useRef({ draw, dibujarMarcador });

  useEffect(() => {
    ultimoDibujo.current = { draw, dibujarMarcador };
    draw();
    // El marcador va detrás porque necesita la proyección que deja el trazado.
    dibujarMarcador();
  }, [draw, dibujarMarcador]);

  useEffect(() => {
    const alCambiarTamano = () => {
      ultimoDibujo.current.draw();
      ultimoDibujo.current.dibujarMarcador();
    };
    const observer = new ResizeObserver(alCambiarTamano);
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const alRedimensionar = () => setSize({ width: 0, height: window.innerWidth < 640 ? 280 : 360 });
    alRedimensionar();
    window.addEventListener('resize', alRedimensionar);
    return () => window.removeEventListener('resize', alRedimensionar);
  }, []);

  /** Traduce un toque sobre el mapa a la distancia de vuelta más cercana. */
  const alSenalar = (evento: React.PointerEvent<HTMLDivElement>) => {
    const caja = wrapperRef.current?.getBoundingClientRect();
    const proyectar = proyeccion.current;
    if (!caja || !proyectar || !onCursor) return;

    const x = evento.clientX - caja.left;
    const y = evento.clientY - caja.top;

    let mejor: number | null = null;
    let distanciaMinima = Infinity;

    for (const punto of rotated) {
      // `typeof` y no `=== null`: una respuesta guardada en la caché del
      // servicio antes de que el trazado incluyera la distancia llega sin el
      // campo, y `undefined` colaba hasta escribirse en el estado.
      if (typeof punto.distance !== 'number') continue;
      const dx = proyectar.px(punto.x) - x;
      const dy = proyectar.py(punto.y) - y;
      const separacion = dx * dx + dy * dy;
      if (separacion < distanciaMinima) {
        distanciaMinima = separacion;
        mejor = punto.distance;
      }
    }

    onCursor(mejor);
  };

  return (
    <figure className="m-0">
      <div
        ref={wrapperRef}
        className="relative w-full touch-pan-y"
        onPointerMove={onCursor ? alSenalar : undefined}
        onPointerDown={onCursor ? alSenalar : undefined}
        // Sin `onPointerLeave`: el marcador se queda donde lo dejaste, y así
        // no se pisa con el cursor de las trazas al pasar de un gráfico a otro.
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Trazado del circuito coloreado por velocidad, vuelta de ${driver}${
            lapTime ? ` en ${lapTime}` : ''
          }. De ${Math.round(minSpeed)} a ${Math.round(maxSpeed)} km/h.`}
        />
        <canvas ref={marcadorRef} aria-hidden className="absolute inset-0 pointer-events-none" />
      </div>

      <figcaption className="mt-2 flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{Math.round(minSpeed)} km/h</span>
        <span
          aria-hidden
          className="h-2 flex-1 rounded-full bg-[linear-gradient(to_right,var(--rampa-clara))] dark:bg-[linear-gradient(to_right,var(--rampa-oscura))]"
          style={
            {
              '--rampa-clara': RAMPA.claro.join(', '),
              '--rampa-oscura': RAMPA.oscuro.join(', '),
            } as React.CSSProperties
          }
        />
        <span className="font-mono tabular-nums">{Math.round(maxSpeed)} km/h</span>
      </figcaption>
    </figure>
  );
}

/** El punto del trazado más cercano a una distancia de vuelta. */
function puntoEn(
  puntos: { x: number; y: number; distance: number | null }[],
  distancia: number | null | undefined
) {
  if (distancia === null || distancia === undefined) return null;

  let mejor: (typeof puntos)[number] | null = null;
  let diferencia = Infinity;

  for (const punto of puntos) {
    if (typeof punto.distance !== 'number') continue;
    const separacion = Math.abs(punto.distance - distancia);
    if (separacion < diferencia) {
      diferencia = separacion;
      mejor = punto;
    }
  }

  return mejor;
}

/** Interpola entre las paradas de la rampa del tema. */
function colorPorVelocidad(proporcion: number, oscuro: boolean): string {
  const paradas = oscuro ? RAMPA.oscuro : RAMPA.claro;
  const t = Math.min(1, Math.max(0, proporcion)) * (paradas.length - 1);
  const indice = Math.min(paradas.length - 2, Math.floor(t));

  return mezclar(paradas[indice], paradas[indice + 1], t - indice);
}

function mezclar(desde: string, hasta: string, peso: number): string {
  const canal = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const valores = [0, 1, 2].map((i) =>
    Math.round(canal(desde, i) + (canal(hasta, i) - canal(desde, i)) * peso)
  );

  return `rgb(${valores.join(' ')})`;
}
