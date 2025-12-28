/**
 * Telemetry API Route
 * GET /api/telemetry/:year/:event/:session/:driver
 */

import { NextRequest, NextResponse } from 'next/server';
import { fastf1Client } from '@/services';
import type { SessionType } from '@/types';

interface RouteParams {
  params: Promise<{
    year: string;
    event: string;
    session: string;
    driver: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { year, event, session, driver } = await params;
    const searchParams = request.nextUrl.searchParams;
    const lap = searchParams.get('lap');

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

    const telemetry = await fastf1Client.getDriverTelemetry(
      yearNum,
      event,
      session as SessionType,
      driver.toUpperCase(),
      lap ? parseInt(lap, 10) : undefined
    );

    return NextResponse.json(telemetry);
  } catch (error) {
    console.error('Telemetry API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch telemetry' },
      { status: 500 }
    );
  }
}
