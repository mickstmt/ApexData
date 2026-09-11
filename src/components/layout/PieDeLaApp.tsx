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
 * Esto NO responde a si la app instalada debe llevar pie en el resto de
 * pantallas, que es una pregunta aparte y sigue abierta. Aquí solo se dice que
 * una pantalla que ocupa la ventana entera no lo lleva.
 */
const PANTALLAS_COMPLETAS = [/^\/results\/[^/]+\/[^/]+\/replay\/?$/];

export function PieDeLaApp() {
  const pathname = usePathname();

  if (PANTALLAS_COMPLETAS.some((ruta) => ruta.test(pathname))) return null;

  // El hueco que deja la barra inferior, para que el pie no quede debajo de
  // ella. Va con el pie y no suelto: sin pie tampoco hace falta el hueco, y
  // dejarlo añadía un desplazamiento vacío al final de la página.
  return (
    <div className="pb-[var(--barra-inferior)]">
      <Footer />
    </div>
  );
}
