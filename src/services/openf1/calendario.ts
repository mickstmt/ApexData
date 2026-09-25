import { sesionesDeTemporada } from './client';
import type { SesionOpenF1 } from './tipos';

/**
 * El calendario de la temporada, pedido una vez cada varias horas y no cada
 * cinco minutos.
 *
 * ## El fallo que esto arregla
 *
 * El reloj de avisos empezaba cada vuelta con `sesionesDeTemporada(2026)`, una
 * petición a OpenF1 por el calendario **entero** de la temporada. Cada cinco
 * minutos, siempre, aunque no hubiera nada que avisar: **288 peticiones al día**
 * para releer una lista que cambia como mucho una vez por fin de semana.
 *
 * Y era el primer paso de la vuelta, así que un fallo suyo **mataba la vuelta
 * completa**: ni avisos, ni previas, ni sondeo. Eso es exactamente lo que se ve
 * en el registro de producción desde el 2026-09-20: «La vuelta falló: OpenF1 no
 * contestó tras 4 intentos: HTTP 401», una y otra vez, con las notificaciones
 * saliendo solo cuando algún tic colaba.
 *
 * El 401 no es que hayan cerrado la API: comprobado el 2026-09-25, desde una
 * conexión doméstica doce peticiones seguidas dan 200. Lo que rechazan es
 * nuestra IP de producción, y machacarles el mismo endpoint 288 veces al día no
 * ayuda a que dejen de hacerlo.
 *
 * ## Qué hace
 *
 * - Pide el calendario como mucho una vez cada seis horas.
 * - Si la petición falla, **devuelve el último calendario bueno** en vez de
 *   propagar el error. Un calendario de hace unas horas es correcto —las
 *   sesiones de un fin de semana se publican con días de antelación—, y perder
 *   la vuelta entera por no poder releerlo no lo es.
 * - Solo si nunca hubo uno bueno, deja subir el error: ahí sí no hay nada que
 *   hacer y el registro debe decirlo.
 */

/** Seis horas: el calendario de un fin de semana se publica con días de antelación. */
export const VIGENCIA_MS = 6 * 60 * 60 * 1000;

interface Guardado {
  anio: number;
  sesiones: SesionOpenF1[];
  pedidoEn: number;
}

let guardado: Guardado | null = null;

/** Para las pruebas: olvida lo recordado. */
export function olvidarCalendario(): void {
  guardado = null;
}

export async function calendarioDeTemporada(
  anio: number,
  ahora: number = Date.now()
): Promise<SesionOpenF1[]> {
  const sirve = guardado?.anio === anio && ahora - guardado.pedidoEn < VIGENCIA_MS;
  if (sirve) return guardado!.sesiones;

  try {
    const sesiones = await sesionesDeTemporada(anio);
    guardado = { anio, sesiones, pedidoEn: ahora };
    return sesiones;
  } catch (error) {
    // Con una copia buena, un fallo de OpenF1 deja de ser un problema: el
    // calendario de hace unas horas sigue siendo el calendario.
    if (guardado?.anio === anio) {
      console.warn(
        `[calendario] OpenF1 falló; se sigue con el calendario de hace ${Math.round(
          (ahora - guardado.pedidoEn) / 60_000
        )} min:`,
        error instanceof Error ? error.message : error
      );
      return guardado.sesiones;
    }

    throw error;
  }
}
