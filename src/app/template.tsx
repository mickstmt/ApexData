import type { ReactNode } from 'react';

import { Transicion } from '@/components/providers/Transicion';

/**
 * La transición direccional, para todas las pantallas de una vez.
 *
 * ## Por qué aquí y no en el layout, y no en cada página
 *
 * La guía de Next dice que el envoltorio no puede ir en un layout, y tiene
 * razón: un layout **persiste** entre navegaciones, así que sus animaciones de
 * entrada y salida no se disparan nunca. De ahí su recomendación de ponerlo en
 * cada `page.tsx`.
 *
 * Pero existe una tercera opción que la guía no menciona: `template.tsx` se
 * vuelve a montar en cada navegación, que es exactamente la condición que hacía
 * falta. Ocho páginas envueltas a mano —cada una con su estructura, sus dos
 * returns y sus helpers debajo— se convierten en este archivo.
 *
 * Y lo importante no es escribir menos: es que una página nueva entra con la
 * transición puesta sin que nadie tenga que acordarse de envolverla. Lo otro
 * envejece mal.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <Transicion>{children}</Transicion>;
}
