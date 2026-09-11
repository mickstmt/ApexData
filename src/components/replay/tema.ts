'use client';

import { useSyncExternalStore } from 'react';
import type { ClaseDeEstado } from '@/lib/replay/estados';

/**
 * El tema del replay, resuelto para lo que no puede leer CSS.
 *
 * La pantalla del replay sigue el tema de la app como cualquier otra: sus
 * colores viven en `--replay-*` en `globals.css`, y todo lo que es DOM los usa
 * directamente con `var(...)`, sin pasar por aquí.
 *
 * Esto existe por el mapa. Un `<canvas>` no resuelve variables CSS —se probó,
 * y `ctx.strokeStyle = 'var(--x)'` se descarta en silencio dejando el negro
 * por defecto— así que alguien tiene que leerlas y dárselas ya resueltas.
 *
 * Y de paso contesta la otra pregunta que una hoja de estilos no puede: cuál
 * de las dos variantes del color de un equipo toca. `team-colors.ts` guarda
 * una legible sobre carbón y otra sobre el fondo claro, y elegir entre ellas
 * es una decisión de JavaScript.
 */

/** Los colores del replay ya resueltos, listos para el lienzo. */
export interface PaletaDelReplay {
  /** El fondo de la pantalla: el borde de cada coche, para separarlo de la pista. */
  fondo: string;
  /** La tinta principal: el aro y el código del coche elegido. */
  texto: string;
  /** El color de la pista en cada estado de bandera. */
  estados: Record<ClaseDeEstado, string>;
}

export interface TemaDelReplay {
  /** Con el tema claro toca la variante de equipo legible sobre claro. */
  claro: boolean;
  paleta: PaletaDelReplay;
}

/**
 * Las banderas como cadena CSS, para lo que sí es DOM.
 *
 * El degradado del scrubber se construye con esto en vez de con la paleta ya
 * resuelta a propósito: así el scrubber cambia de tema solo, sin esperar a que
 * JavaScript lea nada, y sin arriesgar una discrepancia de hidratación por
 * pintar en el servidor un color que solo se conoce en el navegador.
 */
export const TINTA_CSS: Record<ClaseDeEstado, string> = {
  libre: 'var(--replay-trazado)',
  amarilla: 'var(--replay-amarilla)',
  sc: 'var(--replay-naranja)',
  vsc: 'var(--replay-naranja)',
  roja: 'var(--replay-roja)',
};

function leerTema(oscuro: boolean): TemaDelReplay {
  const estilo = getComputedStyle(document.documentElement);
  const leer = (nombre: string) => estilo.getPropertyValue(nombre).trim();

  return {
    claro: !oscuro,
    paleta: {
      fondo: leer('--replay-fondo'),
      texto: leer('--replay-texto'),
      estados: {
        libre: leer('--replay-trazado'),
        amarilla: leer('--replay-amarilla'),
        sc: leer('--replay-naranja'),
        vsc: leer('--replay-naranja'),
        roja: leer('--replay-roja'),
      },
    },
  };
}

/**
 * La última lectura, guardada para poder devolver siempre el mismo objeto
 * mientras el tema no cambie.
 *
 * `useSyncExternalStore` compara por identidad: si aquí se construyera un
 * objeto nuevo en cada consulta, React entendería que el tema cambia en cada
 * render y volvería a renderizar sin parar.
 */
let ultimo: { oscuro: boolean; tema: TemaDelReplay } | null = null;

function instantanea(): TemaDelReplay | null {
  if (typeof document === 'undefined') return null;

  // Barato: solo se vuelve a leer el CSS cuando la clase del documento cambia.
  const oscuro = document.documentElement.classList.contains('dark');
  if (!ultimo || ultimo.oscuro !== oscuro) ultimo = { oscuro, tema: leerTema(oscuro) };
  return ultimo.tema;
}

/** En el servidor no hay tema que leer, y tampoco hay lienzo que pintar. */
function enElServidor(): TemaDelReplay | null {
  return null;
}

function suscribir(avisar: () => void): () => void {
  // Quien cambia el tema es `next-themes`, poniendo o quitando la clase del
  // elemento raíz. No hay evento que escuchar, así que se observa el atributo.
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observador.disconnect();
}

/**
 * Devuelve `null` mientras no haya navegador donde leer.
 *
 * Es deliberado que no haya un valor de partida: cualquiera sería el de un
 * tema concreto, y con el otro activo el mapa se pintaría una vez con los
 * colores equivocados antes de corregirse. Un fotograma tarde es mejor que un
 * fotograma mal.
 */
export function useTemaDelReplay(): TemaDelReplay | null {
  return useSyncExternalStore(suscribir, instantanea, enElServidor);
}
