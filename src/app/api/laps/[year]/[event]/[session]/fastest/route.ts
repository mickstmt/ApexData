/**
 * Fastest Laps API Route
 * GET /api/laps/:year/:event/:session/fastest
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
    const limit = searchParams.get('limit');

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

    const fastestLaps = await fastf1Client.getFastestLaps(
      yearNum,
      event,
      session as SessionType,
      limit ? parseInt(limit, 10) : 10
    );

    return NextResponse.json(fastestLaps);
  } catch (error) {
    console.error('Fastest laps API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch fastest laps' },
      { status: 500 }
    );
  }
}
