/**
 * API Route: /api/drivers/[driverId]
 * Get specific driver by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { jolpicaClient } from '@/services';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    driverId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { driverId } = params;

    // Try database first
    const driverFromDb = await prisma.driver.findUnique({
      where: { driverId },
      include: {
        results: {
          take: 10,
          orderBy: { race: { date: 'desc' } },
          include: {
            race: {
              include: {
                circuit: true,
              },
            },
            constructor: true,
          },
        },
      },
    });

    if (driverFromDb) {
      return NextResponse.json({
        success: true,
        data: driverFromDb,
        source: 'database',
      });
    }

    // Fallback to Jolpica API
    const response = await jolpicaClient.getDriver(driverId);
    const drivers = response.MRData.DriverTable.Drivers;

    if (drivers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: drivers[0],
      source: 'jolpica',
    });
  } catch (error) {
    console.error('Error fetching driver:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch driver',
      },
      { status: 500 }
    );
  }
}
