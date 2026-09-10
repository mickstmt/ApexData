'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

import { anotarNavegacion } from '@/lib/navegacion';

/**
 * Lo que queda del fundido de página: la cuenta de por dónde se ha pasado.
 *
 * ## Qué había aquí y por qué se fue
 *
 * Un fundido de la pantalla entera con `AnimatePresence mode="wait"`, que
 * significa literalmente *espera*: desmontaba la página vieja y solo entonces
 * montaba la nueva. Entre las dos no había ninguna página, y eso se medía —
 * entre 300 y 1130 ms con la pantalla vacía según la ruta, 22 fotogramas
 * seguidos a opacidad cero en la ficha de piloto.
 *
 * Lo peor no era el negro. Durante ese hueco tampoco podía aparecer el
 * esqueleto de `loading.tsx`, porque no había página montada que lo
 * contuviera: la app tenía preparada una pantalla de espera y enseñaba un vacío
 * en su lugar. Por eso Telemetría llegaba a 1130 ms — los 300 de la animación
 * más lo que tardara la página, todo en blanco.
 *
 * Y el fundido no informaba de nada: aparecer y desaparecer no dice si entras o
 * si sales. Lo sustituye una transición direccional, que sí lo dice, en
 * `Transicion.tsx`.
 *
 * ## Por qué el componente sigue existiendo
 *
 * Por dos cosas pequeñas y reales:
 *
 * 1. **`data-pagina`**, que es como las pruebas de navegador saben que hay una
 *    página montada. Con la transición vieja llegaba a haber dos a la vez y por
 *    eso se esperaba a que quedara una; ahora siempre hay una, y el atributo
 *    sigue valiendo para esperar a que la navegación termine.
 * 2. **La cuenta de navegaciones**, que es lo que permite al botón «volver» de
 *    una ficha retroceder de verdad en vez de ir al listado por arriba.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  /**
   * La primera no cuenta: es la pantalla con la que se abrió la app, y detrás
   * de ella no hay ninguna nuestra a la que volver.
   */
  const primeraPantalla = useRef(true);

  useEffect(() => {
    if (primeraPantalla.current) {
      primeraPantalla.current = false;
      return;
    }

    anotarNavegacion();
  }, [pathname]);

  return <div data-pagina="montada">{children}</div>;
}
