import { CLAVE_VISTOS, claveDePaso } from '../src/lib/novedades/pendientes';
import { NOVEDADES } from '../src/lib/novedades/registro';

/**
 * Un navegador que ya ha visto todas las novedades.
 *
 * La guía sale la primera vez que se entra en un módulo, y en una prueba
 * TODAS las visitas son la primera: el navegador empieza vacío. Sin esto, el
 * globo taparía botones que las pruebas de siempre necesitan pulsar, y cada
 * novedad nueva rompería las pruebas de su módulo. Se aplica a todas desde
 * `playwright.config.ts`; las de la guía lo quitan con
 * `test.use({ storageState: NAVEGADOR_VACIO })`.
 */
export function todasLasNovedadesVistas(origen: string) {
  return {
    cookies: [],
    origins: [
      {
        origin: origen,
        localStorage: [
          {
            name: CLAVE_VISTOS,
            value: JSON.stringify(NOVEDADES.flatMap((n) => n.pasos.map((p) => claveDePaso(n, p)))),
          },
        ],
      },
    ],
  };
}

export const NAVEGADOR_VACIO = { cookies: [], origins: [] };
