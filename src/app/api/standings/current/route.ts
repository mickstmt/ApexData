/**
 * API Route: /api/standings/current
 * Get current driver and constructor standings
 */

import { NextRequest, NextResponse } from 'next/server';
import { jolpicaClient } from '@/services';

export const dynamic = 'force-dynamic';

// Revalidate every 1 hour (standings don't change that often)
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'drivers'; // 'drivers' or 'constructors'

    if (type === 'drivers') {
      const response = await jolpicaClient.getDriverStandings('current');
      const standings = response.MRData.StandingsTable.StandingsLists[0];

      return NextResponse.json({
        success: true,
        data: {
          season: standings?.season,
          round: standings?.round,
          standings: standings?.DriverStandings || [],
        },
        source: 'jolpica',
      });
    }

    if (type === 'constructors') {
      const response = await jolpicaClient.getConstructorStandings('current');
      const standings = response.MRData.StandingsTable.StandingsLists[0];

      return NextResponse.json({
        success: true,
        data: {
          season: standings?.season,
          round: standings?.round,
          standings: standings?.ConstructorStandings || [],
        },
        source: 'jolpica',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid type parameter. Use "drivers" or "constructors"',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching standings:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch standings',
      },
      { status: 500 }
    );
  }
}
