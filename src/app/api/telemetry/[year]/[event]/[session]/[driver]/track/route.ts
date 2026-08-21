/**
 * Trazado del circuito coloreado por velocidad.
 * GET /api/telemetry/:year/:event/:session/:driver/track
 */

import { NextRequest, NextResponse } from 'next/server';
import { fastf1Client } from '@/services';
import { TelemetryUnavailableError } from '@/services/fastf1/client';
import type { SessionType } from '@/types';

interface RouteParams {
  params: Promise<{
    year: string;
    event: string;
    session: string;
    driver: string;
  }>;
}

const VALID_SESSIONS: SessionType[] = ['FP1', 'FP2', 'FP3', 'SQ', 'S', 'Q', 'R'];

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { year, event, session, driver } = await params;
    const lap = request.nextUrl.searchParams.get('lap');

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
    }

    if (!VALID_SESSIONS.includes(session as SessionType)) {
      return NextResponse.json(
        { error: 'Invalid session type. Must be one of: FP1, FP2, FP3, SQ, S, Q, R' },
        { status: 400 }
      );
    }

    if (lap !== null && Number.isNaN(parseInt(lap, 10))) {
      // Sin esto, `?lap=abc` se convertía en NaN, el cliente lo descartaba por
      // falsy y la respuesta traía la vuelta rápida etiquetada como si fuera
      // la pedida.
      return NextResponse.json({ error: 'Invalid lap parameter' }, { status: 400 });
    }

    const track = await fastf1Client.getTrackMap(
      yearNum,
      event,
      session as SessionType,
      driver,
      lap ? parseInt(lap, 10) : undefined
    );

    return NextResponse.json(track);
  } catch (error) {
    if (error instanceof TelemetryUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error('Track map API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch track map' },
      { status: 500 }
    );
  }
}
