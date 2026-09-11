'use client';

import { formatoReloj, saltoDe, type Velocidad } from '@/lib/replay/reloj';
import { degradadoDelScrubber, type TramoDelScrubber } from '@/lib/replay/estados';
import { TINTA_CSS } from './tema';

/**
 * Los mandos del replay: el scrubber con las banderas pintadas, diez segundos
 * atrás y adelante, reproducir, y la velocidad.
 *
 * Todo mide 44 px o más: en el móvil van al alcance del pulgar, sobre la barra
 * de pestañas. El botón de reproducir es el grande y el lima porque es el
 * único que hace falta para empezar.
 *
 * El scrubber es un `<input type="range">` de verdad: se arrastra con el dedo,
 * se mueve con las flechas y anuncia el minuto de carrera. Las banderas van
 * pintadas en su pista, en el mismo color que la píldora y el mapa.
 *
 * El degradado se arma con `var(...)` y no con colores ya resueltos: así sigue
 * el tema sin que JavaScript tenga que leer nada, y el servidor puede pintar
 * la misma cadena que el navegador.
 */
export function ControlesDeReplay({
  k,
  count,
  paso,
  reproduciendo,
  velocidad,
  tramos,
  vueltas,
  onAlternar,
  onVelocidad,
  onBuscar,
  conReloj = false,
}: {
  k: number;
  count: number;
  paso: number;
  reproduciendo: boolean;
  velocidad: Velocidad;
  tramos: TramoDelScrubber[];
  /** Los cruces de meta del líder, en porcentaje: las marcas de vuelta. */
  vueltas: number[];
  onAlternar: () => void;
  onVelocidad: () => void;
  onBuscar: (k: number) => void;
  /** En escritorio el reloj cabe aquí; en el móvil va en la cabecera. */
  conReloj?: boolean;
}) {
  const segundos = k * paso;
  const salto = saltoDe(10, paso);

  return (
    <div className="grid gap-2 px-4 pb-2.5 pt-2">
      <div className="relative flex h-11 items-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[18px] h-2 rounded"
          style={{ background: degradadoDelScrubber(tramos, 'var(--replay-superficie-2)', TINTA_CSS) }}
        />
        {vueltas.map((pct, i) => (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute top-[14px] h-4 w-px bg-[var(--replay-tenue)]"
            style={{ left: `${pct}%` }}
          />
        ))}
        <input
          type="range"
          min={0}
          max={count - 1}
          step={1}
          value={Math.floor(k)}
          aria-label="Minuto de la carrera"
          aria-valuetext={formatoReloj(segundos)}
          onChange={(e) => onBuscar(Number(e.target.value))}
          // `relative` no es decorativo: el riel y las marcas de vuelta son
          // `absolute` y el `input` era estático, así que pintaban ENCIMA del
          // pulgar —lo posicionado va por delante de lo que no lo está— y el
          // cursor salía partido por una franja. Se veía igual en los dos
          // temas; con el riel claro se nota más. Posicionarlo lo devuelve
          // delante sin tocar el orden del DOM ni inventar una capa.
          className="replay-scrubber relative h-11 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--replay-acento)]"
        />
      </div>

      <div className={`grid items-center gap-2.5 ${conReloj ? 'grid-cols-[44px_200px_44px_56px_1fr]' : 'grid-cols-[44px_1fr_44px_56px]'}`}>
        <button type="button" onClick={() => onBuscar(k - salto)} aria-label="Diez segundos atrás" className={BOTON}>
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden><path d="M11 6 3 12l8 6zM20 6l-8 6 8 6z" /></svg>
        </button>
        <button
          type="button"
          onClick={onAlternar}
          aria-pressed={reproduciendo}
          className="h-12 rounded-[10px] bg-[var(--replay-acento)] font-display text-sm font-bold tracking-[.06em] text-[var(--replay-acento-tinta)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--replay-texto)]"
        >
          {reproduciendo ? 'PAUSA' : 'REPRODUCIR'}
        </button>
        <button type="button" onClick={() => onBuscar(k + salto)} aria-label="Diez segundos adelante" className={BOTON}>
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden><path d="M13 6l8 6-8 6zM4 6l8 6-8 6z" /></svg>
        </button>
        <button type="button" onClick={onVelocidad} aria-label={`Velocidad: ${velocidad} por uno`} className={BOTON}>
          {velocidad}×
        </button>
        {conReloj && (
          <span className="text-right font-mono text-[13px] tabular-nums text-[var(--replay-apagado)]" aria-hidden>
            {formatoReloj(segundos)}
          </span>
        )}
      </div>
    </div>
  );
}

const BOTON =
  'grid h-11 place-items-center rounded-[10px] bg-[var(--replay-boton)] font-mono text-[13px] font-semibold text-[var(--replay-texto)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--replay-acento)]';
