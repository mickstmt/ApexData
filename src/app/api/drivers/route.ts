/**
 * API Route: /api/drivers
 * Get all F1 drivers with optional filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { jolpicaClient } from '@/services';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // Disable static optimization

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const nationality = searchParams.get('nationality');

    // Try to get from database first
    if (!year || year === 'current') {
      const driversFromDb = await prisma.driver.findMany({
        where: nationality ? { nationality } : undefined,
        take: limit ? parseInt(limit) : 50,
        skip: offset ? parseInt(offset) : 0,
        orderBy: { familyName: 'asc' },
      });

      // If we have drivers in DB, return them
      if (driversFromDb.length > 0) {
        return NextResponse.json({
          success: true,
          data: driversFromDb,
          source: 'database',
        });
      }
    }

    // Fallback to Jolpica API
    const response = await jolpicaClient.getDrivers({
      year: year ? parseInt(year) : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    const drivers = response.MRData.DriverTable.Drivers;

    // Filter by nationality if specified
    const filteredDrivers = nationality
      ? drivers.filter((d) => d.nationality === nationality)
      : drivers;

    return NextResponse.json({
      success: true,
      data: filteredDrivers,
      source: 'jolpica',
      total: parseInt(response.MRData.total),
      limit: parseInt(response.MRData.limit),
      offset: parseInt(response.MRData.offset),
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch drivers',
      },
      { status: 500 }
    );
  }
}
