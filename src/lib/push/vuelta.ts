import { sesionesDeTemporada } from '@/services/openf1/client';

import { avisarDeSesionesTerminadas, type Informe } from './avisos-de-sesion';
import { recordarSesiones, sondearFuentes, type InformeDeCarrera } from './carrera-de-fuentes';
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
  /** El experimento de las fuentes. Temporal; ver `carrera-de-fuentes.ts`. */
  fuentes: InformeDeCarrera;
}

export async function darUnaVuelta(opciones?: {
  ahora?: Date;
  ensayo?: boolean;
}): Promise<InformeDeVuelta> {
  const ahora = opciones?.ahora ?? new Date();
  const sesiones = await sesionesDeTemporada(ahora.getFullYear());

  // Para que el reloj de un minuto del experimento no tenga que volver a
  // pedirlo. Ver `carrera-de-fuentes.ts`.
  recordarSesiones(sesiones);

  // En serie y no en paralelo: las dos escriben en la misma tabla de
  // suscripciones al marcar el último envío, y no hay ninguna prisa.
  const resultados = await avisarDeSesionesTerminadas({ ...opciones, ahora, sesiones });
  const previas = await avisarDePrevias({ ...opciones, ahora, sesiones });

  // El experimento va SIEMPRE al final y aislado.
  //
  // Sondear FastF1 obliga al servicio a cargar la sesión entera y puede tardar
  // medio minuto. Que una medición para decidir algo se ponga por delante de un
  // aviso que alguien está esperando sería tener las prioridades del revés; y
  // si el sondeo falla, los avisos ya salieron.
  let fuentes: InformeDeCarrera = { nuevas: [], sondeos: 0 };

  if (!opciones?.ensayo) {
    try {
      fuentes = await sondearFuentes({ ahora, sesiones });
    } catch (error) {
      console.error('[fuentes] El sondeo falló:', error);
    }
  }

  return { resultados, previas, fuentes };
}
