/**
 * API Route: /api/constructors
 * Get all F1 constructors/teams
 */

import { NextRequest, NextResponse } from 'next/server';
import { jolpicaClient } from '@/services';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const nationality = searchParams.get('nationality');

    // Try database first
    if (!year || year === 'current') {
      const constructorsFromDb = await prisma.constructor.findMany({
        where: nationality ? { nationality } : undefined,
        take: limit ? parseInt(limit) : 50,
        skip: offset ? parseInt(offset) : 0,
        orderBy: { name: 'asc' },
      });

      if (constructorsFromDb.length > 0) {
        return NextResponse.json({
          success: true,
          data: constructorsFromDb,
          source: 'database',
        });
      }
    }

    // Fallback to Jolpica API
    const response = await jolpicaClient.getConstructors({
      year: year ? parseInt(year) : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    const constructors = response.MRData.ConstructorTable.Constructors;

    // Filter by nationality if specified
    const filteredConstructors = nationality
      ? constructors.filter((c) => c.nationality === nationality)
      : constructors;

    return NextResponse.json({
      success: true,
      data: filteredConstructors,
      source: 'jolpica',
      total: parseInt(response.MRData.total),
      limit: parseInt(response.MRData.limit),
      offset: parseInt(response.MRData.offset),
    });
  } catch (error) {
    console.error('Error fetching constructors:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch constructors',
      },
      { status: 500 }
    );
  }
}
