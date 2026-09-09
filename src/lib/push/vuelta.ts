import { sesionesDeTemporada } from '@/services/openf1/client';

import { avisarDeSesionesTerminadas, type Informe } from './avisos-de-sesion';
import { avisarDePrevias, type InformeDePrevias } from './previas-de-sesion';

/**
 * Una vuelta del reloj: mirar si toca avisar de algo.
 *
 * Junta las dos cosas que se hacen cada cinco minutos —la previa de mañana y el
 * resultado de lo que acaba de terminar— para **pedir el calendario una sola
 * vez**. Separadas, cada una haría su propia petición a OpenF1 y en un mes sin
 * carreras eso son diecisiete mil peticiones para no hacer nada.
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
  const sesiones = await sesionesDeTemporada(ahora.getFullYear());

  // En serie y no en paralelo: las dos escriben en la misma tabla de
  // suscripciones al marcar el último envío, y no hay ninguna prisa.
  const resultados = await avisarDeSesionesTerminadas({ ...opciones, ahora, sesiones });
  const previas = await avisarDePrevias({ ...opciones, ahora, sesiones });

  return { resultados, previas };
}
