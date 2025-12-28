/**
 * Session Laps API Route
 * GET /api/laps/:year/:event/:session
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
    const driver = searchParams.get('driver');

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

    const laps = await fastf1Client.getSessionLaps(
      yearNum,
      event,
      session as SessionType,
      driver?.toUpperCase()
    );

    return NextResponse.json(laps);
  } catch (error) {
    console.error('Laps API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch laps' },
      { status: 500 }
    );
  }
}
