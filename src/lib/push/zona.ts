/**
 * Aritmética de fechas en el huso horario de otra persona.
 *
 * ## Por qué hace falta
 *
 * La previa de un Gran Premio no sale «doce horas antes»: sale **a las 20:00
 * de la noche anterior, en tu reloj**. Y eso obliga a hacer una cuenta que
 * JavaScript no sabe hacer solo: dado un huso horario cualquiera, ¿qué instante
 * exacto son las 20:00 de tal día allí?
 *
 * Se midió sobre el calendario de 2026 antes de elegirlo, y por eso está aquí:
 * con una antelación fija de 24 horas, 39 de las 72 previas del año caerían
 * entre las 23:00 y las 08:00 hora de Lima —en Shanghái te avisaría a las 2:30
 * de la madrugada—, y con 12 horas, 16. A las 20:00 no cae ninguna, porque no
 * es una antelación: es una hora del día.
 *
 * ## Sin librerías
 *
 * `Intl` ya sabe todo lo que hay que saber de husos y horarios de verano; lo
 * que no tiene es la operación inversa —de hora local a instante—, y eso es lo
 * que se construye aquí.
 */

/** Un huso horario de la base de datos IANA: `America/Lima`, `Europe/Madrid`. */
export type Zona = string;

/** ¿Es un huso que el navegador reconoce? */
export function zonaValida(zona: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

/**
 * Cuánto se aparta ese huso del UTC en ese instante, en milisegundos.
 *
 * Se calcula formateando el instante en la zona y volviendo a montarlo como si
 * fuera UTC: la diferencia entre los dos es el desfase. Es el truco de siempre,
 * y es exacto porque `Intl` ya aplicó el horario de verano que tocara.
 */
function desfase(instante: Date, zona: Zona): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instante);

  const v: Record<string, number> = {};
  for (const parte of partes) {
    if (parte.type !== 'literal') v[parte.type] = Number(parte.value);
  }

  // `hour` puede venir como 24 a medianoche según el motor; `% 24` lo normaliza.
  const comoUTC = Date.UTC(v.year, v.month - 1, v.day, v.hour % 24, v.minute, v.second);

  return comoUTC - instante.getTime();
}

/** El año, mes y día que marca el calendario de esa zona en ese instante. */
export function diaLocal(instante: Date, zona: Zona): { anio: number; mes: number; dia: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instante);

  const v: Record<string, number> = {};
  for (const parte of partes) {
    if (parte.type !== 'literal') v[parte.type] = Number(parte.value);
  }

  return { anio: v.year, mes: v.month, dia: v.day };
}

/**
 * El instante en que ese reloj marca esa hora de ese día.
 *
 * Se estima con el desfase de la primera aproximación y se corrige una segunda
 * vez. La corrección no es adorno: en la noche del cambio de hora el desfase de
 * la estimación y el del resultado son distintos, y sin repetir la cuenta la
 * previa saldría una hora antes o después justo ese día.
 */
export function instanteDe(
  fecha: { anio: number; mes: number; dia: number },
  hora: number,
  zona: Zona
): Date {
  const ingenuo = Date.UTC(fecha.anio, fecha.mes - 1, fecha.dia, hora, 0, 0);

  let instante = new Date(ingenuo - desfase(new Date(ingenuo), zona));
  instante = new Date(ingenuo - desfase(instante, zona));

  return instante;
}

/** El día natural anterior, sin sufrir con los finales de mes. */
export function diaAnterior(fecha: { anio: number; mes: number; dia: number }) {
  const d = new Date(Date.UTC(fecha.anio, fecha.mes - 1, fecha.dia));
  d.setUTCDate(d.getUTCDate() - 1);

  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

/** La hora en punto de esa zona, para escribirla en el aviso. */
export function horaEnZona(instante: Date, zona: Zona): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: zona,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(instante);
}
