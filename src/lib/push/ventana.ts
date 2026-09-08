import type { SesionOpenF1 } from '@/services/openf1/tipos';

/**
 * Qué sesión entra en un aviso y cuál ya no.
 *
 * Vive aparte del resto porque es lo único de todo esto que se puede comprobar
 * sin base de datos ni red: entra una sesión y una hora, sale sí o no.
 */

/**
 * Cuánto se espera desde que termina una sesión.
 *
 * OpenF1 considera «en directo» —y de pago— desde treinta minutos antes de
 * empezar hasta treinta después de terminar. Fuera de esa ventana los datos son
 * históricos y libres, así que antes de ese momento no hay nada que pedir.
 *
 * Treinta y cinco y no treinta: el margen evita quedarse justo en el borde y
 * gastar una petición que va a volver vacía.
 */
export const ESPERA_MINUTOS = 35;

/**
 * Hasta cuándo se mira atrás.
 *
 * Dos días. Si el servidor estuvo caído todo un domingo, al arrancar todavía
 * encuentra la carrera. Más allá ya no es un aviso, es un recordatorio de algo
 * que se leyó en otro sitio, y lo recoge el sembrado normal.
 */
export const VENTANA_HORAS = 48;

/**
 * El día que esto empezó a existir. Nada anterior se avisa.
 *
 * Es la frontera con el sistema viejo, que avisaba solo de la carrera y con
 * otra marca (`races.notifiedAt`). Sin ella, una base recién creada —o
 * restaurada de un respaldo— daría por nuevas las sesiones del fin de semana
 * anterior y las mandaría todas de golpe.
 *
 * Se caduca sola: la ventana mira 48 horas atrás, así que a los dos días de
 * esta fecha esta condición ya no descarta nada y se puede borrar.
 *
 * La primera versión de esta defensa era otra —«si la tabla está vacía, anota
 * sin avisar»— y estaba mal. El despliegue llegó más de 48 horas después de la
 * última sesión de Monza, así que no había nada que anotar y la tabla se quedó
 * vacía: la siguiente sesión de verdad, la Práctica 1 de Barcelona, se la
 * habría tragado en silencio. Una defensa que se come el primer aviso bueno es
 * peor que no tener defensa.
 */
export const NADA_ANTES_DE = new Date('2026-09-08T00:00:00Z');

/** ¿Terminó hace lo bastante como para pedir sus datos, y no hace demasiado? */
export function estaEnPunto(sesion: SesionOpenF1, ahora: Date): boolean {
  const fin = new Date(sesion.date_end).getTime();
  if (!Number.isFinite(fin)) return false;
  if (fin < NADA_ANTES_DE.getTime()) return false;

  const minutos = (ahora.getTime() - fin) / 60_000;

  return minutos >= ESPERA_MINUTOS && minutos <= VENTANA_HORAS * 60;
}
