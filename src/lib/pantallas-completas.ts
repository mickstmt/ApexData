/**
 * Las pantallas que ocupan la ventana entera.
 *
 * El replay es la única, y lo es a propósito: el mapa se queda pegado arriba,
 * los mandos van fijos abajo y lo que se desplaza en medio es la torre de
 * posiciones. Todo lo que el armazón de la app añade alrededor —el pie y el
 * raíl de secciones— le quita sitio a eso sin dar nada a cambio, porque de esa
 * pantalla no se navega: se mira.
 *
 * La lista vive aquí y no dentro de cada componente para que no se puedan
 * desincronizar. Ya pasó con el pie: se decidió que no saliera en el replay, y
 * cuando llegó el raíl la decisión estaba escrita en un sitio donde el raíl no
 * la veía.
 */
const PANTALLAS_COMPLETAS = [/^\/results\/[^/]+\/[^/]+\/replay\/?$/];

export function esPantallaCompleta(pathname: string): boolean {
  return PANTALLAS_COMPLETAS.some((ruta) => ruta.test(pathname));
}
