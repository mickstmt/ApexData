/**
 * La clasificación de una sesión reconstruida desde los tiempos.
 *
 * GET /api/clasificacion/:year/:event/:session
 *
 * Solo tiene sentido para las sesiones que ordenan por vuelta —clasificación y
 * clasificación al sprint—, así que el resto se rechaza aquí en vez de dejar
 * que el servicio devuelva una lista sin significado.
 */

import { NextResponse } from 'next/server';
import { fastf1Client } from '@/services';
import { SesionSinDatosError, TelemetryUnavailableError } from '@/services/fastf1/client';
import { SegmentoInvalidoError } from '@/services/fastf1/segmentos';
import type { SessionType } from '@/types';

const ORDENAN_POR_VUELTA: SessionType[] = ['Q', 'SQ'];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ year: string; event: string; session: string }> }
) {
  const { year, event, session } = await params;

  const anio = Number.parseInt(year, 10);
  if (Number.isNaN(anio)) {
    return NextResponse.json({ error: 'Año no válido' }, { status: 400 });
  }

  if (!ORDENAN_POR_VUELTA.includes(session as SessionType)) {
    return NextResponse.json(
      { error: 'Solo hay clasificación por tiempos para Q y SQ' },
      { status: 400 }
    );
  }

  try {
    const clasificacion = await fastf1Client.getSessionClassification(
      anio,
      event,
      session as SessionType
    );

    return NextResponse.json(clasificacion);
  } catch (error) {
    // Entrada con mala forma: es culpa de quien pregunta, no nuestra, y
    // decirlo con un 400 evita que un año imposible cueste segundos de
    // servicio buscando una sesión que no puede existir.
    if (error instanceof SegmentoInvalidoError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Aún no se ha corrido: no es un fallo, es que no es la hora.
    if (error instanceof SesionSinDatosError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof TelemetryUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error('Error al reconstruir la clasificación:', error);
    return NextResponse.json({ error: 'No se pudo reconstruir la clasificación' }, { status: 500 });
  }
}
