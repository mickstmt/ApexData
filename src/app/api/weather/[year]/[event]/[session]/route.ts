/**
 * Condiciones de una sesión.
 * GET /api/weather/:year/:event/:session
 *
 * El servicio tenía este endpoint desde el principio y ninguna pantalla lo
 * usaba: la auditoría lo listó entre los «endpoints huérfanos sin UI». Es lo
 * que enseñaba la página `/telemetry` con datos de OpenF1 —y de «la última
 * sesión que hubiera»—, ahora para la sesión que el usuario elige.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fastf1Client } from '@/services';
import { TelemetryUnavailableError } from '@/services/fastf1/client';
import type { SessionType } from '@/types';

interface RouteParams {
  params: Promise<{ year: string; event: string; session: string }>;
}

const VALID_SESSIONS: SessionType[] = ['FP1', 'FP2', 'FP3', 'Q', 'S', 'R'];

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { year, event, session } = await params;

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
    }

    if (!VALID_SESSIONS.includes(session as SessionType)) {
      return NextResponse.json(
        { error: 'Invalid session type. Must be one of: FP1, FP2, FP3, Q, S, R' },
        { status: 400 }
      );
    }

    const weather = await fastf1Client.getSessionWeather(yearNum, event, session as SessionType);

    return NextResponse.json(weather);
  } catch (error) {
    if (error instanceof TelemetryUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch weather' },
      { status: 500 }
    );
  }
}
