/**
 * La fecha de un gran premio, escrita.
 *
 * ## Por qué esto no es `toLocaleDateString` a secas
 *
 * `Race.date` **no es un instante, es una fecha de calendario**: las 352
 * carreras de la base la guardan a medianoche UTC, y la hora real de salida va
 * aparte, en `Race.time`. Es lo que manda Jolpica —`date: "2026-03-08"` y
 * `time: "04:00:00Z"` por separado— y Prisma lo materializa como un `DateTime`
 * a las 00:00Z.
 *
 * Formatear ese valor sin fijar la zona lo reinterpreta como un momento del
 * tiempo. En Lima, que va cinco horas por detrás, medianoche UTC del día 8 son
 * las siete de la tarde del día 7: **el Gran Premio de Australia salía fechado
 * un día antes del que es**. Y de paso rompía la hidratación, porque el
 * servidor va en UTC y el navegador no — React descartaba el HTML del servidor
 * y volvía a pintar en el cliente.
 *
 * Fijándola en UTC se recupera exactamente el día de calendario que publica la
 * F1, que es además el del circuito. Sin necesidad de guardar la zona horaria
 * de cada trazado, que la base no tiene.
 *
 * ## Lo que NO va aquí
 *
 * La **hora de salida** sí es un instante, y ahí lo correcto es la zona de
 * quien mira: la pregunta es «¿a qué hora la veo?». Eso lo resuelve
 * `RaceCountdown`, que pinta primero en UTC —igual que el servidor— y cambia a
 * la zona del navegador en un efecto, que es el único orden que no desajusta la
 * hidratación.
 */

/** El día del gran premio: «8 de marzo de 2026». */
export function fechaDeCarrera(fecha: Date | string, locale = 'es-ES'): string {
  return new Date(fecha).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** La versión corta, para listas y tablas: «08 mar». */
export function fechaDeCarreraCorta(fecha: Date | string, locale = 'es-ES'): string {
  return new Date(fecha).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}
