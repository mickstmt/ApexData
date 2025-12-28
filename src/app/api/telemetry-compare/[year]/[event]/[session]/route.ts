/**
 * Telemetry Comparison API Route
 * GET /api/telemetry-compare/:year/:event/:session?driver1=VER&driver2=HAM
 */

import { NextRequest, NextResponse } from 'next/server';
import { fastf1Client } from '@/services';
import type { SessionType } from '@/types';

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

    const driver1 = searchParams.get('driver1');
    const driver2 = searchParams.get('driver2');
    const lap1 = searchParams.get('lap1');
    const lap2 = searchParams.get('lap2');

    if (!driver1 || !driver2) {
      return NextResponse.json(
        { error: 'Both driver1 and driver2 parameters are required' },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      return NextResponse.json(
        { error: 'Invalid year parameter' },
        { status: 400 }
      );
    }

    const validSessions: SessionType[] = ['FP1', 'FP2', 'FP3', 'Q', 'S', 'R'];
    if (!validSessions.includes(session as SessionType)) {
      return NextResponse.json(
        { error: 'Invalid session type. Must be one of: FP1, FP2, FP3, Q, S, R' },
        { status: 400 }
      );
    }

    const comparison = await fastf1Client.compareTelemetry(
      yearNum,
      event,
      session as SessionType,
      driver1.toUpperCase(),
      driver2.toUpperCase(),
      lap1 ? parseInt(lap1, 10) : undefined,
      lap2 ? parseInt(lap2, 10) : undefined
    );

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Telemetry comparison API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compare telemetry' },
      { status: 500 }
    );
  }
}
