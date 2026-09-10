'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { sePuedeRetroceder } from '@/lib/navegacion';

/**
 * El «volver» de una ficha: retrocede de verdad cuando puede.
 *
 * ## Qué arregla
 *
 * Los cuatro botones de volver de la app —pilotos, equipos, circuitos y
 * resultados— eran enlaces al listado. Un enlace es navegación hacia delante,
 * así que el router llevaba al listado **por arriba**, perdiendo la posición
 * desde la que se había entrado. Medido: de 500 px a 0 en las tres fichas
 * comprobadas.
 *
 * Lo delataba el propio gesto del sistema: deslizar desde el borde sí devolvía
 * a su sitio —462 px— porque eso es historia de verdad. El botón y el gesto
 * hacían cosas distintas, y solo uno de los dos hacía lo que dice.
 *
 * ## Por qué sigue siendo un enlace
 *
 * `href` no es decorativo: es lo que hace que se pueda abrir en otra pestaña,
 * copiar la dirección, o que funcione si el JavaScript aún no ha llegado. Solo
 * se intercepta el clic cuando retroceder tiene sentido; si no, el enlace hace
 * lo suyo.
 *
 * Y esa comprobación se hace **al pulsar**, no al pintar: así el botón no
 * depende de un estado que el servidor no puede saber, y no hay dos versiones
 * del mismo HTML que puedan discrepar al hidratar.
 */
export function VolverAtras({
  href,
  className,
  children,
}: {
  /** A dónde ir cuando no hay nada dentro de la app a lo que volver. */
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      className={className}
      onClick={(evento) => {
        // Un clic con Cmd/Ctrl, o con el botón central, quiere otra pestaña: no
        // es un «volver» y no hay que tocarlo.
        if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) return;
        if (!sePuedeRetroceder()) return;

        evento.preventDefault();
        router.back();
      }}
    >
      {children}
    </Link>
  );
}
