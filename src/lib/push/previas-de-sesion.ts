import { prisma } from '@/lib/prisma';
import { avisarACadaUno, type Aviso } from '@/lib/push';
import { sesionesDeTemporada } from '@/services/openf1/client';
import type { SesionOpenF1 } from '@/services/openf1/tipos';

import { RETROVISOR_HORAS, diasDeCarrera, redactarPrevia, tocaLaPrevia } from './previa';
import { SESIONES, quiereLaSesion } from './redaccion';
import { granPremioDe } from './gran-premio';
import { zonaValida } from './zona';

/**
 * Mandar la previa de cada día de carrera, a las 20:00 de cada cual.
 *
 * ## Por qué esto no se parece a los avisos de resultado
 *
 * Un resultado es el mismo hecho para todo el mundo: se calcula una vez, se
 * manda a todos y se marca una vez. La previa no. Sale a las 20:00 **del reloj
 * de quien la recibe**, así que dos personas en husos distintos la reciben en
 * instantes distintos, con horas escritas distintas y con marcas distintas.
 *
 * De ahí que el bucle sea por suscripción y no por sesión, y que la tabla de
 * marcas lleve el identificador de la suscripción en la clave.
 */

/** Hasta cuándo se mira hacia delante buscando días de carrera. */
const HORIZONTE_DIAS = 5;

export interface InformeDePrevias {
  /** Cuántas previas salieron y a cuántas suscripciones. */
  enviadas: number;
  /** Lo que se mandó, para el registro. */
  textos: string[];
  /** Suscripciones sin huso horario guardado: se quedan sin previa. */
  sinZona: number;
}

/**
 * Mira si a alguien le toca su previa y se la manda.
 *
 * `ensayo` lo calcula todo y no manda ni marca nada.
 */
export async function avisarDePrevias(opciones?: {
  ahora?: Date;
  ensayo?: boolean;
  /** El calendario ya traído, para no pedirlo dos veces en la misma vuelta. */
  sesiones?: SesionOpenF1[];
}): Promise<InformeDePrevias> {
  const ahora = opciones?.ahora ?? new Date();
  const ensayo = opciones?.ensayo ?? false;

  const informe: InformeDePrevias = { enviadas: 0, textos: [], sinZona: 0 };

  const suscripciones = await prisma.pushSubscription.findMany({
    select: { id: true, timezone: true, sessions: true },
  });

  if (!suscripciones.length) return informe;

  const todas = opciones?.sesiones ?? (await sesionesDeTemporada(ahora.getFullYear()));

  // Solo lo de alrededor: mirar la temporada entera en cada vuelta sería
  // agrupar ciento quince sesiones por huso horario cada cinco minutos para
  // nada. Hacia atrás se mira lo justo para que un grupo no pierda las
  // sesiones que ya rodaron y con ellas su identidad.
  const horizonte = new Date(ahora.getTime() + HORIZONTE_DIAS * 24 * 3600e3);
  const retrovisor = new Date(ahora.getTime() - RETROVISOR_HORAS * 3600e3);
  const enJuego = todas.filter((s) => {
    const inicio = new Date(s.date_start);
    return inicio > retrovisor && inicio < horizonte && SESIONES[s.session_name] !== undefined;
  });

  if (!enJuego.length) return informe;

  /** Lo que hay que mandar a cada suscripción, ya redactado. */
  const porMandar = new Map<string, Aviso>();

  for (const suscripcion of suscripciones) {
    if (!suscripcion.timezone || !zonaValida(suscripcion.timezone)) {
      informe.sinZona++;
      continue;
    }

    // Solo las sesiones que esta persona quiere: si apagó las prácticas, su
    // previa no debe anunciárselas.
    const suyas = enJuego.filter((s) =>
      quiereLaSesion(suscripcion.sessions, SESIONES[s.session_name].codigo)
    );

    if (!suyas.length) continue;

    const dias = diasDeCarrera(suyas, suscripcion.timezone);

    for (const [indice, dia] of dias.entries()) {
      if (!tocaLaPrevia(dia, ahora)) continue;

      const yaSalio = await prisma.sentPreview.findUnique({
        where: {
          subscriptionId_sessionKey: {
            subscriptionId: suscripcion.id,
            sessionKey: dia.primera.session_key,
          },
        },
        select: { sentAt: true },
      });

      if (yaSalio) continue;

      const carrera = await granPremioDe(dia.primera);
      if (!carrera) continue;

      const previa = redactarPrevia({
        dia,
        granPremio: carrera.raceName,
        // «Empieza» solo el primer día del fin de semana, que es el único en
        // que la frase es cierta.
        empieza: indice === 0,
        zona: suscripcion.timezone,
      });

      // Se reserva antes de mandar, igual que con los resultados: un aviso
      // repetido en la pantalla de bloqueo no tiene arreglo posterior.
      if (!ensayo) {
        try {
          await prisma.sentPreview.create({
            data: { subscriptionId: suscripcion.id, sessionKey: dia.primera.session_key },
          });
        } catch {
          continue;
        }
      }

      porMandar.set(suscripcion.id, {
        titulo: previa.titulo,
        cuerpo: previa.cuerpo,
        url: `/results/${carrera.year}/${carrera.round}`,
        etiqueta: `previa-${dia.primera.session_key}`,
      });

      informe.textos.push(`${previa.titulo} — ${previa.cuerpo}`);

      // Una por vuelta y por persona: si por lo que sea tocaran dos días a la
      // vez, el segundo sale en la siguiente vuelta, cinco minutos después.
      break;
    }
  }

  if (!porMandar.size || ensayo) {
    informe.enviadas = porMandar.size;
    return informe;
  }

  const envio = await avisarACadaUno((destino) => porMandar.get(destino.id) ?? null);
  informe.enviadas = envio.enviados;

  return informe;
}
