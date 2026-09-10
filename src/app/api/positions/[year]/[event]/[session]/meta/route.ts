/**
 * La descripción del replay: pilotos, línea de tiempo, cruces de vuelta,
 * estados de pista y trazado de referencia.
 * GET /api/positions/:year/:event/:session/meta
 *
 * Es el JSON que da sentido al bloque binario de la ruta de al lado: sin él no
 * se sabe cuántos instantes tiene ni en qué orden van los coches.
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
    const meta = await fastf1Client.getPositionsMeta(anio, event, session as SessionType);

    // 50 KB de JSON que Next serviría en crudo; comprimidos son 18.
    const { cuerpo, cabeceras } = comprimirSiAcepta(request.headers, JSON.stringify(meta));

    return new Response(cuerpo, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...cabeceras,
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

    console.error('Positions meta API error:', error);
    return NextResponse.json({ error: 'No se pudo cargar el replay' }, { status: 500 });
  }
}
