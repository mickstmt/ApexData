'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * La torre de tiempos del replay: el orden de la carrera en este instante.
 *
 * Es la misma fila que el resto de la app —posición, barra de equipo, código,
 * valor a la derecha— para que quien viene de `/results` la reconozca sin
 * aprender nada. Filas de 44 px en el móvil, que es el mínimo tocable; a
 * partir de `md` hay ratón y bajan a 30, la densidad de escritorio del resto
 * de la app.
 *
 * Cada fila es un botón de verdad con `aria-pressed`: elegir un piloto aquí
 * es lo mismo que tocarlo en el mapa, y al elegirlo desde el mapa la fila se
 * pone a la vista —en el móvil la torre es larga y el coche tocado puede ser
 * el 18º.
 */

export interface FilaDeLaTorre {
  piloto: number;
  posicion: number;
  codigo: string;
  nombre: string;
  equipo: string | null;
  color: string;
  /** `+1.2s`, `líder`, o vacío si está fuera. */
  hueco: string;
  fuera: boolean;
}

export function TorreDeTiempos({
  filas,
  elegido,
  onElegir,
  className,
  tapadoArriba = 0,
  tapadoAbajo = 0,
}: {
  filas: FilaDeLaTorre[];
  elegido: number | null;
  onElegir: (piloto: number) => void;
  className?: string;
  /**
   * Cuánto hay tapado por encima y por debajo, en píxeles, en el móvil: el
   * bloque pegado con el mapa, y los mandos fijos con la barra de pestañas.
   *
   * Es lo que hace que «poner a la vista» ponga de verdad a la vista: sin
   * `scroll-margin`, desplazar hasta una fila la dejaba en el borde, justo
   * debajo del mapa o de los mandos, y no se podía tocar. Se vio con la
   * carrera real, con la fila 18. A partir de `md` la torre se desplaza sola
   * y no hay nada encima, así que ahí los márgenes son cero.
   */
  tapadoArriba?: number;
  tapadoAbajo?: number;
}) {
  const refs = useRef(new Map<number, HTMLButtonElement>());

  useEffect(() => {
    if (elegido === null) return;
    const fila = refs.current.get(elegido);
    if (!fila) return;
    const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    fila.scrollIntoView({ block: 'nearest', behavior: suave ? 'smooth' : 'auto' });
  }, [elegido]);

  return (
    <ol
      className={cn('m-0 list-none p-0', className)}
      aria-label="Clasificación en este instante"
      style={{ '--tapado-arriba': `${tapadoArriba}px`, '--tapado-abajo': `${tapadoAbajo}px` } as React.CSSProperties}
    >
      {filas.map((fila) => {
        const activa = fila.piloto === elegido;
        return (
          <li key={fila.piloto}>
            <button
              type="button"
              ref={(el) => {
                if (el) refs.current.set(fila.piloto, el);
                else refs.current.delete(fila.piloto);
              }}
              aria-pressed={activa}
              onClick={() => onElegir(fila.piloto)}
              className={cn(
                'grid w-full grid-cols-[30px_4px_1fr_auto] items-center gap-x-2.5 px-4 text-left',
                'min-h-[44px] border-b border-[var(--replay-borde-fila)] md:min-h-[30px] md:grid-cols-[28px_3px_1fr_auto] md:border-b-0 md:px-3.5',
                '[scroll-margin-top:var(--tapado-arriba)] [scroll-margin-bottom:var(--tapado-abajo)] md:[scroll-margin-bottom:0px] md:[scroll-margin-top:0px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--replay-acento)]',
                activa ? 'bg-[var(--replay-superficie-2)]' : 'md:hover:bg-[var(--replay-superficie)]',
                fila.fuera && 'opacity-60'
              )}
            >
              <span className="text-right font-mono text-sm tabular-nums text-[var(--replay-apagado)]">{fila.posicion}</span>
              <span aria-hidden className="h-6 w-1 rounded-sm md:h-[18px] md:w-[3px]" style={{ backgroundColor: fila.color }} />
              <span className="min-w-0 truncate text-[15px] font-semibold md:text-sm">
                {fila.codigo}
                {fila.equipo && <span className="ml-1.5 text-xs font-normal text-[var(--replay-apagado)]">{fila.equipo}</span>}
              </span>
              {fila.fuera ? (
                <span className="font-mono text-xs font-bold tracking-wider text-[var(--replay-roja)]">OUT</span>
              ) : (
                <span className="font-mono text-[13px] tabular-nums text-[var(--replay-hueco)]">{fila.hueco}</span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
