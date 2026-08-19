'use client';

import { useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Filas que se deslizan a su nuevo sitio en vez de saltar.
 *
 * Envuelve una lista servida desde el servidor: al cambiar de temporada, los
 * pilotos que aparecen en las dos se mueven a su nueva posición en lugar de
 * aparecer ya colocados. Es la técnica FLIP —medir dónde estaban, dejar que
 * React coloque, y animar la diferencia— hecha sobre el DOM, porque las filas
 * llegan como `children` desde un componente de servidor y no hay estado que
 * observar aquí dentro.
 *
 * Cada hijo directo debe llevar `data-flip-id` con algo estable (el piloto, el
 * equipo). Sin él, la fila no se anima: no hay forma de saber que es la misma.
 *
 * Se mide con `offsetTop`, no con `getBoundingClientRect`: la segunda es
 * relativa a la ventana, así que un desplazamiento de la página entre los dos
 * pintados se colaría como un salto inventado.
 *
 * Sin rebote a propósito: un número que se pasa de su posición y vuelve se lee
 * como un error de datos, no como un adorno.
 */

const DURACION = 280;

export function FlipRows({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const previas = useRef(new Map<string, number>());
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;

    const actuales = new Map<string, number>();

    for (const hijo of Array.from(nodo.children)) {
      const fila = hijo as HTMLElement;
      const id = fila.dataset.flipId;
      if (!id) continue;

      const posicion = fila.offsetTop;
      actuales.set(id, posicion);

      const antes = previas.current.get(id);
      if (antes === undefined || reduceMotion) continue;

      const salto = antes - posicion;
      if (Math.abs(salto) < 2) continue;

      fila.animate(
        [{ transform: `translateY(${salto}px)` }, { transform: 'translateY(0)' }],
        { duration: DURACION, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
      );
    }

    previas.current = actuales;
  });

  return (
    <div ref={contenedor} className={className}>
      {children}
    </div>
  );
}
