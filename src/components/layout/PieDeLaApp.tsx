'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

/**
 * El pie de la app, y las pantallas que no lo llevan.
 *
 * El replay ocupa la ventana entera a propósito: el mapa se queda pegado
 * arriba y los mandos van fijos abajo, así que lo que se desplaza en medio es
 * la torre. El pie quedaba justo ahí, entre los dos, y en el iPhone medía
 * 553 px —dos tercios de la pantalla— con el logo de ApexData y la navegación
 * repetida bajo el circuito. No es que asomara: era lo que más se veía.
 *
 * Se decide por ruta y en cliente porque el pie vive en el layout raíz, que es
 * de servidor y no sabe qué página está debajo.
 *
 * La otra pregunta —si la app instalada debe llevar pie— ya está contestada, y
 * no aquí: la respuesta es que no, y la aplica una regla de CSS sobre
 * `[data-instalada]`. Lo que este componente decide es solo qué pantallas no
 * lo llevan en ningún caso.
 */
const PANTALLAS_COMPLETAS = [/^\/results\/[^/]+\/[^/]+\/replay\/?$/];

export function PieDeLaApp() {
  const pathname = usePathname();

  if (PANTALLAS_COMPLETAS.some((ruta) => ruta.test(pathname))) return null;

  // El hueco que deja la barra inferior, para que lo último de la página no
  // quede debajo de ella.
  //
  // El hueco se queda SIEMPRE y el pie no. En la app instalada el pie sobra
  // —su navegación ya está en la barra y en «Más»— pero la barra sigue tapando
  // los últimos píxeles, así que quitar el contenedor entero dejaría el final
  // de cada página debajo de ella. Quien esconde el pie es una regla de CSS
  // sobre `[data-instalada]`, y no este componente, porque si se decidiera
  // aquí React pintaría en el servidor un pie que el navegador tendría que
  // quitar: un salto a la vista, o una discrepancia de hidratación.
  return (
    <div data-pie-de-la-app className="pb-[var(--barra-inferior)]">
      <Footer />
    </div>
  );
}
