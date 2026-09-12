import type { SesionOpenF1 } from '@/services/openf1/tipos';

import { SESIONES, LIMITE_CARACTERES } from './redaccion';
import { diaAnterior, diaLocal, horaEnZona, instanteDe, type Zona } from './zona';

/**
 * El aviso de «mañana hay Gran Premio».
 *
 * ## Una previa por día, no por sesión
 *
 * Con una por sesión, el jueves recibirías dos avisos diciendo «mañana» —uno
 * por la Práctica 1 y otro por la Práctica 2, que son el mismo día— y el
 * viernes otros dos. No sobran por ser muchos: sobran porque repiten el mismo
 * mensaje. Agrupadas por día se anuncian todas las sesiones igual, en un solo
 * aviso, y el fin de semana pasa de diez avisos a ocho sin perder información.
 *
 * ## A las 20:00, no «N horas antes»
 *
 * Una antelación fija hereda el huso del circuito. Medido sobre las 72 previas
 * de 2026 en hora de Lima: con 24 horas, 39 caerían entre las 23:00 y las
 * 08:00; con 12 horas, 16 —y otras 16 caerían el mismo día de la sesión, así
 * que el aviso diría «mañana» cuando en realidad es hoy—. A las 20:00 de la
 * noche anterior no cae ninguna a deshora, porque no es una antelación: es una
 * hora del día, la de quien lo recibe.
 */

/** La hora a la que sale la previa, en el reloj de quien la recibe. */
export const HORA_DE_LA_PREVIA = 20;

/**
 * Cuánto se mira hacia ATRÁS, y por qué no es cero.
 *
 * Aquí estuvo el fallo de la previa repetida. El viernes a las 08:01 llegó un
 * segundo aviso diciendo «Mañana empieza: Práctica 2 10:00» — la FP2 era ese
 * mismo día, dos horas después, y la previa buena había salido el jueves a las
 * 20:00 anunciando las dos sesiones del viernes.
 *
 * No fue que la marca fallara. La marca lleva la clave de la PRIMERA sesión
 * del grupo, y el grupo cambió de primera: mirando solo hacia delante, en
 * cuanto la FP1 empezó dejó de estar en la lista, así que el grupo del viernes
 * pasó de [FP1, FP2] a [FP2] y con él su identidad. Grupo nuevo, clave nueva,
 * sin marca, y `tocaLaPrevia` seguía diciendo que sí porque la FP2 aún no
 * había empezado. Por eso mencionaba solo la FP2 y por eso decía «empieza»:
 * era, literalmente, un grupo distinto.
 *
 * Con retrovisor, una sesión que ya empezó sigue contando para formar su
 * grupo, así que el grupo del viernes sigue siendo [FP1, FP2] y `tocaLaPrevia`
 * lo descarta solo —su primera sesión ya rodó—. Treinta horas y no veinticuatro
 * porque un día local dura veinticuatro y hace falta margen para alcanzar la
 * primera sesión de un grupo desde después de la última.
 *
 * Mirar atrás no puede resucitar previas viejas: `tocaLaPrevia` exige que la
 * primera sesión del grupo no haya empezado, y eso es falso para todo grupo del
 * pasado.
 */
export const RETROVISOR_HORAS = 30;


export interface DiaDeCarrera {
  /** La sesión más temprana del día. Identifica al grupo. */
  primera: SesionOpenF1;
  sesiones: SesionOpenF1[];
  /** Cuándo sale la previa de este día. */
  aviso: Date;
}

/**
 * Las sesiones de un fin de semana, agrupadas por el día en que caen **allí
 * donde se van a ver**.
 *
 * Agrupar por el día del circuito sería lo natural y sería un error: alguien en
 * Lima ve la clasificación de Shanghái de madrugada, y lo que le importa es en
 * qué día suyo cae, no en cuál caía en China.
 */
export function diasDeCarrera(sesiones: SesionOpenF1[], zona: Zona): DiaDeCarrera[] {
  const grupos = new Map<string, SesionOpenF1[]>();

  for (const sesion of sesiones) {
    if (!SESIONES[sesion.session_name]) continue;

    const dia = diaLocal(new Date(sesion.date_start), zona);
    const clave = `${dia.anio}-${dia.mes}-${dia.dia}`;

    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave)!.push(sesion);
  }

  return [...grupos.values()]
    .map((delDia) => {
      const ordenadas = [...delDia].sort((a, b) => a.date_start.localeCompare(b.date_start));
      const primera = ordenadas[0];
      const dia = diaLocal(new Date(primera.date_start), zona);

      return {
        primera,
        sesiones: ordenadas,
        aviso: instanteDe(diaAnterior(dia), HORA_DE_LA_PREVIA, zona),
      };
    })
    .sort((a, b) => a.primera.date_start.localeCompare(b.primera.date_start));
}

export interface PrevaRedactada {
  titulo: string;
  cuerpo: string;
}

/**
 * El texto de la previa de un día.
 *
 * Las horas se escriben en el huso de quien lo recibe, que es el mismo con el
 * que se decidió cuándo mandarlo. Si se formatearan en el del circuito, el
 * aviso diría una hora y el teléfono marcaría otra.
 */
export function redactarPrevia(opciones: {
  dia: DiaDeCarrera;
  /** El nombre del Gran Premio, tal como lo guarda la base. */
  granPremio: string;
  /** Si es el primer día del fin de semana, se dice que empieza. */
  empieza: boolean;
  zona: Zona;
}): PrevaRedactada {
  const { dia, granPremio, empieza, zona } = opciones;

  /**
   * «a las», y no un espacio ni un separador.
   *
   * El nombre de una práctica acaba en número, así que «Práctica 3 05:30» pone
   * dos cifras seguidas y hay que pararse a separarlas. Lo reportó el usuario
   * leyendo su propia notificación.
   *
   * Se eligió entre cinco formas, medidas contra el límite de 90 caracteres:
   * las cinco caben —la más larga se queda en 77— así que se pudo elegir por
   * cómo se lee. Un `·` o unos paréntesis dejan los dos números pegados y hay
   * que interpretar el segundo; «a las» dice que es una hora sin que nadie
   * tenga que pensarlo.
   */
  const lista = dia.sesiones
    .map(
      (s) => `${SESIONES[s.session_name].nombre} a las ${horaEnZona(new Date(s.date_start), zona)}`
    )
    .join(' y ');

  const cuerpo = `${empieza ? 'Mañana empieza: ' : 'Mañana: '}${lista}.`;

  return {
    titulo: `${granPremio} · mañana`,
    // Un fin de semana al sprint puede juntar tres sesiones en un día y pasarse
    // de los 90 caracteres. Antes que cortar a media frase, se resume: la lista
    // completa está en la app, a un toque del propio aviso.
    cuerpo:
      cuerpo.length <= LIMITE_CARACTERES
        ? cuerpo
        : `Mañana, ${dia.sesiones.length} sesiones. La primera, ${SESIONES[dia.primera.session_name].nombre} a las ${horaEnZona(new Date(dia.primera.date_start), zona)}.`,
  };
}

/**
 * ¿Toca mandar ya la previa de este día?
 *
 * Dos condiciones, y la segunda importa tanto como la primera: ya pasó la hora
 * de avisar, **y la primera sesión todavía no ha empezado**. Sin esa segunda, un
 * servidor que estuvo caído toda la noche despertaría mandando la previa de una
 * práctica que ya está rodando, que es peor que no avisar.
 */
export function tocaLaPrevia(dia: DiaDeCarrera, ahora: Date): boolean {
  return ahora >= dia.aviso && ahora < new Date(dia.primera.date_start);
}
