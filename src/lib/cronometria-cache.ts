/**
 * Cuánto puede guardarse una respuesta de cronometría.
 *
 * ## El fallo que esto arregla
 *
 * El 2026-09-15 se les puso `Cache-Control: public, max-age=86400` a las cuatro
 * rutas de cronometría, y con buen motivo: el usuario reportó que «siempre en
 * las prácticas libres pide la data cada vez que entramos», porque cada visita
 * hacía al servicio descargar la sesión entera.
 *
 * Lo que no se vio es que **una respuesta de 200 puede ser provisional**. El
 * comentario de entonces decía «si la sesión aún no ha corrido no se llega
 * hasta aquí: es un 404», y eso solo es cierto cuando FastF1 no tiene la sesión.
 * En cuanto puede cargarla pero las vueltas todavía no están —la franja entre
 * que acaba la sesión y que se publica la cronometría, media hora medida en
 * Bakú— la respuesta es un **200 con la lista vacía**, y ese vacío se quedaba
 * un día entero en el navegador de quien mirase en ese momento.
 *
 * Es justo lo que reportó el usuario el 2026-09-24: los avisos de las prácticas
 * de Bakú llegaban con sus resultados y la pantalla seguía diciendo que no
 * había información. La API sí la tenía —comprobado con `curl`, 22 vueltas—;
 * quien no la tenía era su teléfono, con la respuesta vacía congelada.
 *
 * ## La regla
 *
 * - **Vacío: no se guarda.** Un vacío nunca es una respuesta final; es «todavía
 *   no».
 * - **Con datos: cinco minutos, y un día de margen para revalidar.** Con
 *   `stale-while-revalidate` la segunda visita sigue siendo instantánea —que es
 *   lo que se pedía— pero el navegador refresca por detrás, así que una
 *   respuesta incompleta se cura sola en minutos en vez de durar un día. Una
 *   práctica a medio publicar puede traer ocho pilotos de veintidós, y eso es
 *   200 y no está vacío.
 */

/** Cinco minutos frescos, y hasta un día sirviendo lo viejo mientras refresca. */
const CON_DATOS = 'public, max-age=300, stale-while-revalidate=86400';

/** Un vacío es «todavía no», y eso no se guarda. */
const SIN_DATOS = 'no-store';

export function cabecerasDeCronometria(hayDatos: boolean): Record<string, string> {
  return { 'Cache-Control': hayDatos ? CON_DATOS : SIN_DATOS };
}

/** ¿Trae algo esta respuesta? Cualquier lista suya con al menos un elemento. */
export function tieneDatos(cuerpo: unknown, ...campos: string[]): boolean {
  if (!cuerpo || typeof cuerpo !== 'object') return false;

  const registro = cuerpo as Record<string, unknown>;
  return campos.some((campo) => {
    const valor = registro[campo];
    return Array.isArray(valor) && valor.length > 0;
  });
}
