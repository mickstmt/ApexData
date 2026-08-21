'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { teamColor } from '@/lib/team-colors';
import {
  comoTiempo,
  prepararDispersion,
  resumirPiloto,
  type PuntoVuelta,
} from '@/lib/lap-scatter';
import type { LapData } from '@/types';

/**
 * Dispersión de tiempos por vuelta.
 *
 * Cada punto es una vuelta. La tabla de vueltas rápidas ya dice quién fue el
 * más rápido; lo que aquí se ve es otra cosa: **cómo de constante fue cada
 * uno**. Una nube apretada es un piloto repitiendo ritmo; una dispersa es
 * tráfico, errores o neumáticos cayéndose. Y las tandas se leen solas, porque
 * cada juego nuevo aparece como un escalón hacia abajo.
 *
 * Tres decisiones que conviene no deshacer:
 *
 * 1. **El resto de la parrilla se pinta en gris, detrás.** Veinte colores a la
 *    vez no son veinte series: son una mancha. El campo da el contexto —dónde
 *    está el ritmo de la carrera, dónde entró el coche de seguridad— y los dos
 *    pilotos elegidos se leen encima.
 * 2. **Los dos elegidos se distinguen también por forma**, relleno y anillo, y
 *    eso no es decoración. Los colores de equipo son identidad de marca, no una
 *    paleta elegida: medidos con el validador, Ferrari y Haas se separan **ΔE
 *    3,6 con visión normal** —por debajo de 15 ya cuesta distinguirlos, y en
 *    deuteranopía bajan a 3,3— y Alpine con Racing Point, 3,4. Dos compañeros de
 *    equipo comparten color directamente. Sin la forma, comparar esos pares
 *    sería comparar dos nubes del mismo color.
 * 3. **En lienzo, no en SVG.** Una carrera son unas 1.100 vueltas; en SVG eso
 *    son 1.100 nodos.
 */

/*
 * Sobre la paleta: el validador marca fuera de banda la luminosidad del naranja
 * de McLaren sobre fondo oscuro, y se deja así a propósito. Esa comprobación
 * existe para que las series tengan peso visual parecido cuando uno elige los
 * colores; aquí no se eligen — son los de los equipos, los mismos que usan el
 * resto de gráficos de la app. Cambiarlos por cumplir una banda rompería la
 * identidad y la coherencia con las barras, las rayas y las trazas.
 */
const ALTO = 340;
const MARGEN = { arriba: 14, derecha: 14, abajo: 26, izquierda: 62 };

export function LapScatter({
  laps,
  destacados,
  teamOf,
}: {
  laps: LapData[];
  /** Los pilotos que se leen encima del campo. Como mucho dos. */
  destacados: string[];
  teamOf: (code: string) => string | null;
}) {
  const { resolvedTheme } = useTheme();
  const lienzo = useRef<HTMLCanvasElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [senalado, setSenalado] = useState<PuntoVuelta | null>(null);
  const posiciones = useRef<{ punto: PuntoVuelta; x: number; y: number }[]>([]);

  const datos = useMemo(() => prepararDispersion(laps), [laps]);
  const elegidos = useMemo(
    () => destacados.filter((code) => datos.pilotos.includes(code)).slice(0, 2),
    [destacados, datos.pilotos]
  );

  const resumenes = useMemo(
    () =>
      elegidos
        .map((code) => resumirPiloto(datos.visibles, code))
        .filter((r): r is NonNullable<typeof r> => r !== null),
    [elegidos, datos.visibles]
  );

  useEffect(() => {
    const medir = () => setAncho(caja.current?.clientWidth ?? 0);
    medir();

    const observador = new ResizeObserver(medir);
    if (caja.current) observador.observe(caja.current);
    return () => observador.disconnect();
  }, []);

  const dibujar = useCallback(() => {
    const canvas = lienzo.current;
    if (!canvas || ancho === 0 || datos.visibles.length === 0) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = ancho * ratio;
    canvas.height = ALTO * ratio;
    canvas.style.width = `${ancho}px`;
    canvas.style.height = `${ALTO}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, ancho, ALTO);

    const estilos = getComputedStyle(document.documentElement);
    const tinta = `hsl(${estilos.getPropertyValue('--muted-foreground').trim()})`;
    const rejilla = `hsl(${estilos.getPropertyValue('--border').trim()})`;
    const fondo = `hsl(${estilos.getPropertyValue('--card').trim()})`;
    const oscuro = resolvedTheme
      ? resolvedTheme === 'dark'
      : document.documentElement.classList.contains('dark');

    const izquierda = MARGEN.izquierda;
    const derecha = ancho - MARGEN.derecha;
    const arriba = MARGEN.arriba;
    const abajo = ALTO - MARGEN.abajo;

    const px = (vuelta: number) =>
      izquierda + ((vuelta - 1) / Math.max(1, datos.totalVueltas - 1)) * (derecha - izquierda);
    const py = (ms: number) =>
      abajo - ((ms - datos.mejor) / Math.max(1, datos.techo - datos.mejor)) * (abajo - arriba);

    // Rejilla: cuatro líneas y sus tiempos. Recesiva a propósito — el dato son
    // los puntos, no las guías.
    ctx.strokeStyle = rejilla;
    ctx.fillStyle = tinta;
    ctx.lineWidth = 1;
    ctx.font = '11px ui-monospace, monospace';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 3; i++) {
      const ms = datos.mejor + ((datos.techo - datos.mejor) * i) / 3;
      const y = Math.round(py(ms)) + 0.5;

      ctx.beginPath();
      ctx.moveTo(izquierda, y);
      ctx.lineTo(derecha, y);
      ctx.stroke();
      ctx.fillText(comoTiempo(ms), izquierda - 8, y + 3);
    }

    ctx.textAlign = 'left';
    ctx.fillText('V1', izquierda, abajo + 16);
    ctx.textAlign = 'right';
    ctx.fillText(`V${datos.totalVueltas}`, derecha, abajo + 16);

    // El campo, detrás y en gris.
    posiciones.current = [];
    ctx.globalAlpha = oscuro ? 0.32 : 0.26;
    ctx.fillStyle = tinta;

    for (const punto of datos.visibles) {
      if (elegidos.includes(punto.code)) continue;

      ctx.beginPath();
      ctx.arc(px(punto.vuelta), py(punto.ms), 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Los elegidos, encima. El primero relleno, el segundo en anillo: si son
    // compañeros comparten color y la forma es lo único que los separa.
    elegidos.forEach((code, indice) => {
      const { onDark, onLight } = teamColor(teamOf(code));
      const color = oscuro ? onDark : onLight;

      for (const punto of datos.visibles) {
        if (punto.code !== code) continue;

        const x = px(punto.vuelta);
        const y = py(punto.ms);
        posiciones.current.push({ punto, x, y });

        ctx.beginPath();
        ctx.arc(x, y, 3.4, 0, Math.PI * 2);

        if (indice === 0) {
          ctx.fillStyle = color;
          ctx.fill();
          // Un aro del color del fondo separa los puntos que se solapan.
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = fondo;
          ctx.stroke();
        } else {
          ctx.lineWidth = 2;
          ctx.strokeStyle = color;
          ctx.stroke();
        }
      }
    });

    // El punto señalado, marcado por encima de todo.
    if (senalado) {
      const encontrado = posiciones.current.find(
        (p) => p.punto.code === senalado.code && p.punto.vuelta === senalado.vuelta
      );

      if (encontrado) {
        ctx.beginPath();
        ctx.arc(encontrado.x, encontrado.y, 7, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = tinta;
        ctx.stroke();
      }
    }
  }, [ancho, datos, elegidos, resolvedTheme, senalado, teamOf]);

  useEffect(() => {
    dibujar();
  }, [dibujar]);

  /** Al señalar, se busca el punto destacado más cercano. */
  const alSenalar = (evento: React.PointerEvent<HTMLDivElement>) => {
    const rect = caja.current?.getBoundingClientRect();
    if (!rect || posiciones.current.length === 0) return;

    const x = evento.clientX - rect.left;
    const y = evento.clientY - rect.top;

    let cercano: PuntoVuelta | null = null;
    let minima = 30 * 30;

    for (const posicion of posiciones.current) {
      const distancia = (posicion.x - x) ** 2 + (posicion.y - y) ** 2;
      if (distancia < minima) {
        minima = distancia;
        cercano = posicion.punto;
      }
    }

    if (cercano) setSenalado(cercano);
  };

  if (datos.visibles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta sesión no trae vueltas cronometradas.
      </p>
    );
  }

  return (
    <figure className="m-0">
      <div
        ref={caja}
        className="w-full touch-pan-y"
        onPointerMove={alSenalar}
        onPointerDown={alSenalar}
      >
        <canvas
          ref={lienzo}
          role="img"
          aria-label={`Dispersión de ${datos.visibles.length} vueltas de ${datos.pilotos.length} pilotos. La más rápida, ${comoTiempo(datos.mejor)}. Los tiempos de cada piloto destacado están resumidos en la tabla siguiente.`}
        />
      </div>

      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {resumenes.map((resumen, indice) => (
          <span key={resumen.code} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={
                indice === 0
                  ? { backgroundColor: teamColor(teamOf(resumen.code)).color }
                  : {
                      border: `2px solid ${teamColor(teamOf(resumen.code)).color}`,
                    }
              }
            />
            {resumen.code}
          </span>
        ))}

        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          Resto de la parrilla
        </span>

        {senalado && (
          <span className="ml-auto font-mono tabular-nums">
            {senalado.code} · V{senalado.vuelta} · {comoTiempo(senalado.ms)}
          </span>
        )}
      </figcaption>

      {datos.fuera > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {datos.fuera} {datos.fuera === 1 ? 'vuelta queda' : 'vueltas quedan'} fuera de la escala:
          paradas en boxes, coche de seguridad y vueltas de entrada. La escala llega hasta el 110 %
          de la vuelta más rápida.
        </p>
      )}

      {resumenes.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">
            Ritmo y constancia de los pilotos destacados, sobre sus vueltas en escala
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="pb-1.5 font-medium">
                Piloto
              </th>
              <th scope="col" className="pb-1.5 text-right font-medium">
                Vueltas
              </th>
              <th scope="col" className="pb-1.5 text-right font-medium">
                Mejor
              </th>
              <th scope="col" className="pb-1.5 text-right font-medium">
                Mediana
              </th>
              <th scope="col" className="pb-1.5 text-right font-medium">
                Horquilla
              </th>
            </tr>
          </thead>
          <tbody>
            {resumenes.map((resumen) => (
              <tr key={resumen.code} className="border-b border-border last:border-0">
                <th scope="row" className="py-1.5 text-left font-semibold">
                  {resumen.code}
                </th>
                <td className="py-1.5 text-right font-mono tabular-nums">{resumen.vueltas}</td>
                <td className="py-1.5 text-right font-mono tabular-nums">
                  {comoTiempo(resumen.mejor)}
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums">
                  {comoTiempo(resumen.mediana)}
                </td>
                {/* La horquilla es la mitad central de sus vueltas: cuanto más
                    pequeña, más metronómico. */}
                <td className="py-1.5 text-right font-mono tabular-nums">
                  {(resumen.intercuartil / 1000).toFixed(3)} s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
