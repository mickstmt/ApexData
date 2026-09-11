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

/**
 * ¿La fecha de una sesión lleva hora dentro, o es solo un día?
 *
 * Las sesiones no siguen la convención de la carrera. `Race.date` es un día de
 * calendario con la hora aparte en `Race.time`; `fp1Date`, `qualiDate` y las
 * demás son un instante completo —`2026-03-06T01:30:00Z`— y su campo `*Time`
 * hermano está a null en las 352 carreras de la base. Nunca se usó.
 *
 * El problema es que no todas lo llevan. Medido sobre la base entera: de 2022
 * en adelante las 115 carreras traen la hora real de cada sesión; de 2010 a
 * 2021, las 237 restantes guardan el día a medianoche UTC en punto, porque
 * Ergast nunca publicó esos horarios. Escribir «00:00» ahí no sería un dato
 * viejo, sería un dato inventado: parecería que la práctica fue a medianoche.
 *
 * De ahí la comprobación, que es una heurística y conviene decirlo: se toma
 * medianoche UTC clavada —hora, minuto y segundo a cero— como «no se sabe la
 * hora». Ninguna de las 115 sesiones con horario real cae ahí. Podría pasar
 * algún día con una sesión nocturna, y entonces el precio es ocultar una hora
 * que sí sabemos; al revés —inventar una que no existe— es peor. Quitarle lo
 * de heurística exige distinguirlo en la base, que son 352 carreras a resembrar.
 */
export function tieneHoraConocida(fecha: Date | string | null | undefined): boolean {
  if (!fecha) return false;
  const d = new Date(fecha);
  return !(d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0);
}

/**
 * La hora UTC de un instante, como la escribe la fuente: «01:30:00Z».
 *
 * Existe para poder pasarle una sesión a `HoraDeSalida`, que recibe el día y la
 * hora por separado porque así es como llegan los de la carrera.
 */
export function horaUTCDe(fecha: Date | string): string {
  const d = new Date(fecha);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}:${dos(d.getUTCSeconds())}Z`;
}
