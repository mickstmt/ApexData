import { calendarioDeTemporada } from '@/services/openf1/calendario';

import { avisarDeSesionesTerminadas, type Informe } from './avisos-de-sesion';
import { avisarDePrevias, type InformeDePrevias } from './previas-de-sesion';

/**
 * Una vuelta del reloj: mirar si toca avisar de algo.
 *
 * Junta las dos cosas que se hacen cada cinco minutos —la previa de mañana y el
 * resultado de lo que acaba de terminar— para **pedir el calendario una sola
 * vez**. Separadas, cada una haría su propia petición a OpenF1 y en un mes sin
 * carreras eso son diecisiete mil peticiones para no hacer nada.
 *
 * Y ese calendario ya no se pide a OpenF1 en cada vuelta, sino cada seis horas:
 * ver `openf1/calendario`, que además sobrevive a un fallo suyo en vez de
 * llevarse la vuelta por delante.
 */
export interface InformeDeVuelta {
  resultados: Informe;
  previas: InformeDePrevias;
}

export async function darUnaVuelta(opciones?: {
  ahora?: Date;
  ensayo?: boolean;
}): Promise<InformeDeVuelta> {
  const ahora = opciones?.ahora ?? new Date();
  /**
   * El calendario, de la copia guardada.
   *
   * Antes esto era una petición a OpenF1 en cada vuelta —288 al día por una
   * lista que cambia una vez por fin de semana— y, peor, era el primer paso:
   * un 401 suyo mataba la vuelta entera y no salía ni un aviso. Se ve en el
   * registro de producción desde el 2026-09-20. Ver `openf1/calendario`.
   */
  const sesiones = await calendarioDeTemporada(ahora.getFullYear(), ahora.getTime());


  // En serie y no en paralelo: las dos escriben en la misma tabla de
  // suscripciones al marcar el último envío, y no hay ninguna prisa.
  const resultados = await avisarDeSesionesTerminadas({ ...opciones, ahora, sesiones });
  const previas = await avisarDePrevias({ ...opciones, ahora, sesiones });

  return { resultados, previas };
}
