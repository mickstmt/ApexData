'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { compoundInk } from '@/lib/team-colors';
import { caidaPorCompuesto, comoCaida } from '@/lib/tyre-degradation';
import type { LapData } from '@/types';

/**
 * Cuánto se cae cada compuesto conforme se gasta.
 *
 * Cada punto es una vuelta, colocada por **vida del neumático** —no por vuelta
 * de carrera— y por lo que perdió respecto a la primera vuelta de su tanda. Así
 * se pueden mezclar coches de ritmo distinto: lo que se compara es cuánto se
 * cae cada uno respecto a sí mismo. La línea es la mediana de las tandas de ese
 * compuesto.
 *
 * **El color no basta y aquí se nota más que en otros gráficos.** Medidos sobre
 * el fondo claro, los colores oficiales dan 1,36:1 el medio y 1,07:1 el duro
 * —invisibles—, así que se derivan a 3:1; y ya derivados, blando y medio se
 * separan ΔE 5,3 en deuteranopía y duro y medio 12,1 con visión normal. Por eso
 * cada compuesto lleva además **su trazo** y **su nombre escrito al final de la
 * línea**, y la tabla de debajo repite los números.
 */

const ALTO = 300;
const MARGEN = { arriba: 16, derecha: 96, abajo: 28, izquierda: 52 };

/** El trazo de cada compuesto: la segunda diferencia, la que no depende del color. */
const TRAZO: Record<string, number[]> = {
  SOFT: [],
  MEDIUM: [7, 4],
  HARD: [2, 4],
  INTERMEDIATE: [10, 3, 2, 3],
  WET: [4, 3],
};

const NOMBRE: Record<string, string> = {
  SOFT: 'Blando',
  MEDIUM: 'Medio',
  HARD: 'Duro',
  INTERMEDIATE: 'Interm.',
  WET: 'Lluvia',
};

export function TyreDegradation({ laps }: { laps: LapData[] }) {
  const { resolvedTheme } = useTheme();
  const lienzo = useRef<HTMLCanvasElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);

  const caidas = useMemo(() => caidaPorCompuesto(laps), [laps]);

  const { vidaMaxima, deltaMaximo } = useMemo(() => {
    if (caidas.length === 0) return { vidaMaxima: 0, deltaMaximo: 0 };

    const vidas = caidas.map((c) => c.vidaMaxima);
    // El eje se corta en el percentil 90 de los deltas: una tanda con tráfico
    // trae vueltas de +8 s que estirarían la escala hasta aplastar el resto.
    const deltas = caidas
      .flatMap((c) => c.vueltas.map((v) => v.delta))
      .filter((d) => d >= 0)
      .sort((a, b) => a - b);

    return {
      vidaMaxima: Math.max(...vidas),
      deltaMaximo: Math.max(1.5, deltas[Math.floor(deltas.length * 0.9)] ?? 2),
    };
  }, [caidas]);

  useEffect(() => {
    const medir = () => setAncho(caja.current?.clientWidth ?? 0);
    medir();

    const observador = new ResizeObserver(medir);
    if (caja.current) observador.observe(caja.current);
    return () => observador.disconnect();
  }, []);

  const dibujar = useCallback(() => {
    const canvas = lienzo.current;
    if (!canvas || ancho === 0 || caidas.length === 0) return;

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
    const oscuro = resolvedTheme
      ? resolvedTheme === 'dark'
      : document.documentElement.classList.contains('dark');

    const izquierda = MARGEN.izquierda;
    const derecha = ancho - MARGEN.derecha;
    const arriba = MARGEN.arriba;
    const abajo = ALTO - MARGEN.abajo;

    const px = (vida: number) => izquierda + (vida / Math.max(1, vidaMaxima)) * (derecha - izquierda);
    const py = (delta: number) =>
      abajo - (Math.max(0, delta) / Math.max(0.5, deltaMaximo)) * (abajo - arriba);

    ctx.font = '11px ui-monospace, monospace';
    ctx.strokeStyle = rejilla;
    ctx.fillStyle = tinta;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.textAlign = 'right';

    for (let i = 0; i <= 3; i++) {
      const delta = (deltaMaximo * i) / 3;
      const y = Math.round(py(delta)) + 0.5;

      ctx.beginPath();
      ctx.moveTo(izquierda, y);
      ctx.lineTo(derecha, y);
      ctx.stroke();
      ctx.fillText(`+${delta.toFixed(1)}s`, izquierda - 8, y + 3);
    }

    ctx.textAlign = 'center';
    ctx.fillText('Vida del neumático (vueltas)', (izquierda + derecha) / 2, abajo + 20);
    ctx.textAlign = 'left';
    ctx.fillText('0', izquierda, abajo + 20);
    ctx.textAlign = 'right';
    ctx.fillText(String(vidaMaxima), derecha, abajo + 20);

    for (const caida of caidas) {
      const color = compoundInk(caida.compuesto, oscuro);

      // Las vueltas, tenues: son el respaldo de la línea, no el mensaje.
      ctx.globalAlpha = oscuro ? 0.3 : 0.26;
      ctx.fillStyle = color;

      for (const vuelta of caida.vueltas) {
        if (vuelta.delta < 0 || vuelta.delta > deltaMaximo) continue;

        ctx.beginPath();
        ctx.arc(px(vuelta.vida), py(vuelta.delta), 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // La mediana de sus tandas, desde el neumático nuevo.
      const finX = px(caida.vidaMaxima);
      const finY = py(caida.pendiente * caida.vidaMaxima);

      ctx.beginPath();
      ctx.setLineDash(TRAZO[caida.compuesto] ?? []);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.moveTo(px(0), py(0));
      ctx.lineTo(finX, finY);
      ctx.stroke();
      ctx.setLineDash([]);

      // El nombre al final de su línea: la identidad no puede ser solo color.
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px ui-sans-serif, system-ui';
      ctx.fillText(NOMBRE[caida.compuesto] ?? caida.compuesto, finX + 6, finY + 4);
      ctx.font = '11px ui-monospace, monospace';
    }
  }, [ancho, caidas, deltaMaximo, resolvedTheme, vidaMaxima]);

  useEffect(() => {
    dibujar();
  }, [dibujar]);

  if (caidas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta sesión no trae tandas lo bastante largas para medir la caída.
      </p>
    );
  }

  return (
    <figure className="m-0">
      <div ref={caja} className="w-full">
        <canvas
          ref={lienzo}
          role="img"
          aria-label={`Caída de cada compuesto por vuelta de vida: ${caidas
            .map((c) => `${NOMBRE[c.compuesto] ?? c.compuesto}, ${comoCaida(c.pendiente)}`)
            .join('; ')}. Los mismos números están en la tabla siguiente.`}
        />
      </div>

      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">Caída de cada compuesto, en segundos por vuelta</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th scope="col" className="pb-1.5 font-medium">
              Compuesto
            </th>
            <th scope="col" className="pb-1.5 text-right font-medium">
              Caída
            </th>
            <th scope="col" className="pb-1.5 text-right font-medium">
              Tandas
            </th>
            <th scope="col" className="pb-1.5 text-right font-medium">
              Vida máxima
            </th>
          </tr>
        </thead>
        <tbody>
          {caidas.map((caida) => (
            <tr key={caida.compuesto} className="border-b border-border last:border-0">
              <th scope="row" className="py-1.5 text-left font-semibold">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-border"
                    style={{ backgroundColor: compoundInk(caida.compuesto, false) }}
                  />
                  {NOMBRE[caida.compuesto] ?? caida.compuesto}
                </span>
              </th>
              <td className="py-1.5 text-right font-mono tabular-nums">
                {comoCaida(caida.pendiente)}
              </td>
              <td className="py-1.5 text-right font-mono tabular-nums">{caida.tandas}</td>
              <td className="py-1.5 text-right font-mono tabular-nums">{caida.vidaMaxima}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <figcaption className="mt-2 text-xs text-muted-foreground">
        Cada punto es una vuelta, colocada por la vida de su neumático y por lo que perdió respecto
        a la primera vuelta de su tanda. La línea es la mediana de las tandas.{' '}
        <b>La caída real es mayor que la dibujada</b>: el depósito se va vaciando y eso resta
        tiempo por vuelta, así que lo que se ve es el saldo de las dos fuerzas.
      </figcaption>
    </figure>
  );
}
