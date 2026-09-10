/**
 * Las posiciones de toda la carrera, para el replay.
 * GET /api/positions/:year/:event/:session
 *
 * Es la única ruta de la web que no devuelve JSON: el cuerpo es el bloque
 * binario tal como lo manda el servicio, y el navegador lo lee como
 * `ArrayBuffer`. Su descripción —cuántos instantes, en qué orden los pilotos—
 * viaja aparte, en `/meta`.
 *
 * Solo carrera y sprint: la clasificación es una vuelta suelta y ya la cubren
 * las trazas con el cursor sobre el mapa. Se rechaza aquí, antes de gastar una
 * petición al servicio.
 */

import { NextResponse } from 'next/server';
import { fastf1Client } from '@/services';
import { SesionSinDatosError, TelemetryUnavailableError } from '@/services/fastf1/client';
import { SegmentoInvalidoError } from '@/services/fastf1/segmentos';
import { comprimirSiAcepta } from '@/lib/respuesta-comprimida';
import type { SessionType } from '@/types';

const CON_CARRERA: SessionType[] = ['R', 'S'];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ year: string; event: string; session: string }> }
) {
  const { year, event, session } = await params;

  const anio = Number.parseInt(year, 10);
  if (Number.isNaN(anio)) {
    return NextResponse.json({ error: 'Año no válido' }, { status: 400 });
  }

  if (!CON_CARRERA.includes(session as SessionType)) {
    return NextResponse.json(
      { error: 'El replay solo existe para carrera y sprint (R, S)' },
      { status: 400 }
    );
  }

  try {
    const bloque = await fastf1Client.getPositions(anio, event, session as SessionType);

    // Medido: sin comprimir, una carrera son 2,66 MB por el cable; con gzip,
    // 1,59. Next no lo hace por nosotros (ver `respuesta-comprimida.ts`).
    const { cuerpo, cabeceras } = comprimirSiAcepta(request.headers, bloque);

    return new Response(cuerpo, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        ...cabeceras,
        // Una carrera corrida no cambia: el navegador puede quedársela un día
        // sin volver a pedirla. Si no ha corrido, no llega aquí (es un 404).
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    // Entrada con mala forma: es culpa de quien pregunta, no nuestra.
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

    console.error('Positions API error:', error);
    return NextResponse.json({ error: 'No se pudieron cargar las posiciones' }, { status: 500 });
  }
}
