'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLayoutEffect, useState } from 'react';

/**
 * El globo que señala la tecla de fracción la primera vez.
 *
 * ## Por qué un globo y no otra cosa
 *
 * Se probaron cuatro en una maqueta navegable —globo con anillo, globo solo,
 * una franja con «Ver dónde» y una insignia «Nuevo»— y se eligió este. La
 * franja empuja el teclado mientras se usa y pide un paso más; la insignia
 * sola no explica qué hace la tecla. El globo va pegado a ella, no tapa lo que
 * hay debajo de él y no bloquea nada: se puede seguir calculando con él
 * abierto. Es el patrón de los consejos de Apple (TipKit).
 *
 * ## Por qué va fuera del chasis
 *
 * El chasis lleva `overflow-hidden` para que la librea respete las esquinas, y
 * dentro de él el globo saldría cortado. Se pinta en el contenedor de fuera,
 * colocado sobre la tecla con sus coordenadas.
 *
 * Cuándo sale, cuándo se cierra y qué se guarda lo decide `Calculadora.tsx`;
 * esto solo lo pinta.
 */

export const ID_AVISO = 'aviso-fraccion';

interface Sitio {
  left: number;
  top: number;
  /** Dónde cae la punta, medida desde el borde izquierdo del globo. */
  flecha: number;
  /** Si no cabe encima de la tecla, va debajo. */
  debajo: boolean;
}

export function AvisoDeFraccion({
  abierto,
  contenedor,
  alCerrar,
}: {
  abierto: boolean;
  contenedor: React.RefObject<HTMLDivElement | null>;
  alCerrar: () => void;
}) {
  const [globo, setGlobo] = useState<HTMLDivElement | null>(null);
  const [sitio, setSitio] = useState<Sitio | null>(null);
  const reducido = useReducedMotion();

  // Se coloca después de pintar y antes de que se vea, que es lo que hace
  // `useLayoutEffect`: con `useEffect` se vería un fotograma en la esquina.
  // Y se recoloca si cambia el ancho, porque en escritorio el teclado pasa de
  // apilado a lado a lado y la tecla se mueve de sitio.
  useLayoutEffect(() => {
    const caja = contenedor.current;
    if (!abierto || !globo || !caja) return;

    const colocar = () => {
      const tecla = caja.querySelector<HTMLElement>('[data-tecla="fraccion"]');
      if (!tecla) return;
      const c = caja.getBoundingClientRect();
      const t = tecla.getBoundingClientRect();
      const ancho = globo.offsetWidth;
      const alto = globo.offsetHeight;
      const centro = t.left - c.left + t.width / 2;
      const left = Math.max(6, Math.min(centro - ancho / 2, c.width - ancho - 6));
      const encima = t.top - c.top - alto - 12;
      const debajo = encima < 6;
      setSitio({
        left,
        top: debajo ? t.bottom - c.top + 12 : encima,
        flecha: Math.max(14, Math.min(centro - left - 6, ancho - 26)),
        debajo,
      });
    };

    colocar();
    const vigia = new ResizeObserver(colocar);
    vigia.observe(caja);
    return () => vigia.disconnect();
  }, [abierto, globo, contenedor]);

  const desplazamiento = reducido ? 0 : sitio?.debajo ? -6 : 6;

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          ref={setGlobo}
          id={ID_AVISO}
          key="aviso"
          initial={{ opacity: 0, y: desplazamiento }}
          animate={{ opacity: sitio ? 1 : 0, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ left: sitio?.left ?? 0, top: sitio?.top ?? 0 }}
          className={
            'absolute z-20 w-[min(270px,calc(100%-12px))] rounded-[14px] px-3.5 pb-3 pt-3 ' +
            'bg-[var(--calc-tinta)] text-[var(--calc-panel)] shadow-[0_14px_34px_-12px_rgba(0,0,0,0.55)]'
          }
        >
          <span
            aria-hidden
            className="absolute h-3 w-3 rotate-45 rounded-[2px] bg-[var(--calc-tinta)]"
            style={{ left: sitio?.flecha ?? 14, ...(sitio?.debajo ? { top: -6 } : { bottom: -6 }) }}
          />

          <p className="text-sm font-bold">Nuevo: fracciones exactas</p>
          <p className="mt-1 text-sm leading-snug">
            Escribe el número de arriba, pulsa esta tecla y escribe el de abajo.
          </p>
          <p className="my-2 flex items-center gap-1.5 font-mono text-[15px] font-semibold">
            <Mini arriba={1} abajo={2} />
            <span aria-hidden>+</span>
            <Mini arriba={1} abajo={3} />
            <span aria-hidden>=</span>
            <Mini arriba={5} abajo={6} />
            {/* Apilado, el ejemplo no tiene nada que leer; dicho, sí. */}
            <span className="sr-only">Un medio más un tercio igual a cinco sextos.</span>
          </p>
          <p className="text-sm leading-snug">
            Después de «=», el botón del visor lo pasa a decimal.
          </p>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs opacity-80">
              Atajo: <kbd className="rounded border border-current px-1 font-mono">f</kbd>
            </span>
            <button
              type="button"
              onClick={alCerrar}
              className={
                'min-h-[44px] min-w-[44px] rounded-[10px] px-4 text-sm font-semibold ' +
                'bg-[var(--calc-azul)] text-[var(--calc-igual-tinta)] ' +
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calc-panel)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--calc-tinta)]'
              }
            >
              Entendido
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Una fracción pequeña, apilada, para el ejemplo del globo. */
function Mini({ arriba, abajo }: { arriba: number; abajo: number }) {
  return (
    <span aria-hidden className="inline-flex flex-col items-center text-[13px] leading-none">
      <span className="px-0.5">{arriba}</span>
      <span className="my-[2px] h-[1.5px] self-stretch bg-current" />
      <span className="px-0.5">{abajo}</span>
    </span>
  );
}
