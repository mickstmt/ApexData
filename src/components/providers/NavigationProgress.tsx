'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';

/**
 * Indicador de navegación entre páginas.
 *
 * En el App Router una página que hace `await prisma…` no pinta nada hasta que
 * la consulta termina, así que entre pulsar un enlace y ver la página nueva no
 * había ninguna señal. Aquí sale un coche cruzando la pantalla con la barra de
 * avance arriba, que es lo que el usuario eligió sobre el mockup.
 *
 * Tres decisiones que conviene no perder:
 *
 * 1. **Solo cambios de ruta.** Cambiar de temporada es una navegación de query
 *    dentro de la misma página; ese caso lo señala `SeasonSelector` velando el
 *    contenido, y sacar además el coche sería anunciar dos veces lo mismo.
 * 2. **No aparece antes de {@link APPEAR_AFTER_MS}.** Una navegación resuelta
 *    en 80 ms con un coche cruzando por encima se siente más lenta, no menos.
 * 3. **El router del App Router no emite eventos**, así que el arranque se
 *    detecta interceptando el clic en un enlace interno y el final, viendo
 *    cambiar `usePathname()`.
 */

/** Por debajo de esto la navegación se siente instantánea: mejor no interrumpir. */
const APPEAR_AFTER_MS = 250;

/**
 * Plazo de rendición. Si la navegación no llega —o el clic ni siquiera navegaba—
 * el indicador se apaga solo. Diez segundos: que se retire antes de tiempo en
 * una página lentísima es inofensivo —el contenido sigue llegando— y quedarse
 * puesto sobre una página que ya no espera nada, no.
 */
const GIVE_UP_AFTER_MS = 10_000;

export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const giveUpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (giveUpTimer.current) clearTimeout(giveUpTimer.current);
    showTimer.current = null;
    giveUpTimer.current = null;
    setVisible(false);
  }, []);

  // La página nueva ya está montada: se acabó la espera. El apagado se aplaza
  // un tick porque cambiar el estado de forma síncrona dentro del efecto
  // encadena un render de más.
  useEffect(() => {
    const id = setTimeout(stop, 0);
    return () => clearTimeout(id);
  }, [pathname, stop]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Un clic con modificador abre en otra pestaña: aquí no se navega.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      // Mismo destino, o solo cambia la query: no hay página nueva que esperar.
      if (url.pathname === window.location.pathname) return;

      // Dos temporizadores anteriores sin cancelar dejaban uno huérfano al
      // pulsar dos veces seguidas: `stop()` solo alcanzaba al último, y el
      // huérfano encendía el velo sin nadie que lo apagara.
      stop();

      showTimer.current = setTimeout(() => setVisible(true), APPEAR_AFTER_MS);
      giveUpTimer.current = setTimeout(stop, GIVE_UP_AFTER_MS);
    };

    // En captura, a propósito. Se probó en burbuja para poder descartar los
    // clics que otro componente anula, y ahí `Link` ya ha llamado a
    // `preventDefault()` —así navega el App Router—, de modo que la
    // comprobación descartaba TODAS las navegaciones y el indicador no salía
    // nunca. Un clic anulado y una navegación de cliente son indistinguibles
    // desde el evento, así que en lugar de intentar separarlos se acota el
    // daño: el plazo de rendición es corto y cualquier interacción posterior
    // apaga el indicador.
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [stop]);

  // Con el indicador puesto, cualquier toque o tecla lo retira: si el usuario
  // sigue interactuando es que la página anterior nunca se fue.
  useEffect(() => {
    if (!visible) return;

    document.addEventListener('pointerdown', stop);
    document.addEventListener('keydown', stop);
    return () => {
      document.removeEventListener('pointerdown', stop);
      document.removeEventListener('keydown', stop);
    };
  }, [visible, stop]);

  useEffect(() => stop, [stop]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" role="status" aria-live="polite">
      <span className="sr-only">Cargando la página…</span>

      {/* El velo apaga la página anterior sin ocultarla: sigue claro de dónde
          se viene mientras llega lo nuevo. */}
      <div className="absolute inset-0 bg-background/70" />

      <div className="absolute inset-x-0 top-0 h-[3px] bg-border">
        <div
          className="h-full origin-left bg-primary"
          style={{ animation: 'nav-progress 8s cubic-bezier(0.15, 0.85, 0.3, 1) forwards' }}
        />
      </div>

      {reduceMotion ? null : (
        <div
          className="absolute left-0 top-1/2 text-primary"
          style={{ animation: 'nav-car 1.5s cubic-bezier(0.42, 0, 0.32, 1) infinite' }}
        >
          {/* La estela va detrás del coche y se apaga hacia atrás, que es la
              lectura de velocidad sin necesidad de más piezas. */}
          <div
            className="absolute right-[104px] top-1/2 h-[3px] w-48 -translate-y-1/2 bg-gradient-to-l from-primary to-transparent"
            aria-hidden
          />
          <RaceCar />
        </div>
      )}
    </div>
  );
}

/** Silueta de monoplaza, en `currentColor` para que siga al tema. */
function RaceCar() {
  return (
    <svg viewBox="0 0 130 40" className="block h-auto w-[120px]" fill="currentColor" aria-hidden>
      <path d="M2 31h22l6-7h14l5-9h16l4 9h22l6-4h16l-3 11h8v4H2z" />
      <path d="M104 6h24v4h-24z" />
      <path d="M114 10h4v9h-4z" />
      <path d="M0 26h14v6H0z" />
      <circle cx="34" cy="31" r="8" />
      <circle cx="98" cy="31" r="9" />
    </svg>
  );
}
