/**
 * API Route: /api/seasons/[year]
 * Get season information including races calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { jolpicaClient } from '@/services';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    year: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const year = resolvedParams.year === 'current' ? 'current' : parseInt(resolvedParams.year);

    // Try database first (only for historical data)
    if (typeof year === 'number') {
      const seasonFromDb = await prisma.season.findUnique({
        where: { year },
        include: {
          races: {
            include: {
              circuit: true,
            },
            orderBy: {
              round: 'asc',
            },
          },
        },
      });

      if (seasonFromDb) {
        return NextResponse.json({
          success: true,
          data: seasonFromDb,
          source: 'database',
        });
      }
    }

    // Fallback to Jolpica API
    const response = await jolpicaClient.getRaces(year);
    const races = response.MRData.RaceTable.Races;

    if (races.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Season not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        year: races[0].season,
        races: races,
      },
      source: 'jolpica',
    });
  } catch (error) {
    console.error('Error fetching season:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch season',
      },
      { status: 500 }
    );
  }
}
