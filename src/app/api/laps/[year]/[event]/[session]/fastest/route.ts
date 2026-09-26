/**
 * Fastest Laps API Route
 * GET /api/laps/:year/:event/:session/fastest
 */

import { NextRequest, NextResponse } from 'next/server';
import { fastf1Client } from '@/services';
import { SesionSinDatosError, TelemetryUnavailableError } from '@/services/fastf1/client';
import { SegmentoInvalidoError } from '@/services/fastf1/segmentos';
import type { SessionType } from '@/types';
import { cabecerasDeCronometria, tieneDatos } from '@/lib/cronometria-cache';
import {
  cuantasVueltas,
  guardarSiDefinitiva,
  leerGuardada,
  recortada,
  type CronometriaGuardable,
} from '@/lib/cronometria-guardada';

interface RouteParams {
  params: Promise<{
    year: string;
    event: string;
    session: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { year, event, session } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit');

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      return NextResponse.json(
        { error: 'Invalid year parameter' },
        { status: 400 }
      );
    }

    const validSessions: SessionType[] = ['FP1', 'FP2', 'FP3', 'SQ', 'S', 'Q', 'R'];
    if (!validSessions.includes(session as SessionType)) {
      return NextResponse.json(
        { error: 'Invalid session type. Must be one of: FP1, FP2, FP3, SQ, S, Q, R' },
        { status: 400 }
      );
    }

    const pedido = limit ? parseInt(limit, 10) : 10;
    const tipo = session as SessionType;

    /**
     * Lo guardado primero, y sin caducidad.
     *
     * Los tiempos de una sesión terminada no cambian, y sin embargo se volvían
     * a pedir cada hora: medido el 2026-09-26, 0,06 s en caliente contra
     * 4,35 s en frío. Ese frío es el «pidiendo los tiempos» que se ve al
     * entrar en una práctica.
     */
    const guardada = await leerGuardada<CronometriaGuardable>(yearNum, event, tipo);

    if (guardada) {
      return NextResponse.json(recortada(guardada, pedido), {
        headers: cabecerasDeCronometria(cuantasVueltas(guardada) > 0),
      });
    }

    /**
     * Se pide de más a propósito: 30 cubre una parrilla entera con holgura, y
     * cargar la sesión cuesta lo mismo pidiendo 10 que 30. Así lo que se
     * guarda vale para cualquier límite que pida luego cualquiera.
     */
    const fastestLaps = await fastf1Client.getFastestLaps(
      yearNum,
      event,
      tipo,
      Math.max(pedido, 30)
    );

    // No se espera a que termine: quien pregunta ya tiene su respuesta, y si
    // la escritura falla se vuelve a pedir la próxima vez. Es una caché.
    void guardarSiDefinitiva(yearNum, event, tipo, fastestLaps);

    return NextResponse.json(recortada(fastestLaps, pedido), {
      // Un vacio no se guarda: es «todavia no», no una respuesta final.
      // Ver `@/lib/cronometria-cache`.
      headers: cabecerasDeCronometria(tieneDatos(fastestLaps, 'fastest_laps')),
    });
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

    console.error('Fastest laps API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch fastest laps' },
      { status: 500 }
    );
  }
}
