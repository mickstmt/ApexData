/**
 * Estrategia de neumáticos de una sesión.
 * GET /api/laps/:year/:event/:session/stints
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
  }>;
}

const VALID_SESSIONS: SessionType[] = ['FP1', 'FP2', 'FP3', 'SQ', 'S', 'Q', 'R'];

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { year, event, session } = await params;

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

    const stints = await fastf1Client.getStints(yearNum, event, session as SessionType);

    return NextResponse.json(stints);
  } catch (error) {
    if (error instanceof TelemetryUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error('Stints API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stints' },
      { status: 500 }
    );
  }
}
