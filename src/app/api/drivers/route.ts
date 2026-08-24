/**
 * API Route: /api/drivers
 * Get all F1 drivers with optional filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { jolpicaClient } from '@/services';
import { prisma } from '@/lib/prisma';

/**
 * Un parámetro numérico de la URL, con suelo y techo.
 *
 * Sin esto, `?limit=abc` daba un 500 con el cuerpo de la consulta de Prisma
 * dentro —nombres de modelo y de campos, gratis para quien preguntara— y
 * `?offset=-5` reventaba con un error de aserción. Comprobado en producción el
 * 2026-08-24.
 */
function acotar(valor: string | null, porDefecto: number, minimo: number, maximo: number): number {
  if (!valor) return porDefecto;

  const numero = Number.parseInt(valor, 10);
  if (!Number.isFinite(numero)) return porDefecto;

  return Math.min(Math.max(numero, minimo), maximo);
}

export const dynamic = 'force-dynamic'; // Disable static optimization

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const nationality = searchParams.get('nationality');

    // Favoritos: se piden exactamente los guardados en vez de la primera
    // página de la tabla. Antes se traían 50 pilotos por orden alfabético y se
    // filtraba en el cliente, así que cualquier favorito por debajo del puesto
    // 50 desaparecía de /favorites sin explicación — y en la base hay 84.
    const ids = searchParams.get('ids');

    if (ids) {
      const driverIds = ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 100);

      const favorites = await prisma.driver.findMany({
        where: { driverId: { in: driverIds } },
        orderBy: { familyName: 'asc' },
      });

      return NextResponse.json({
        success: true,
        data: favorites,
        source: 'database',
      });
    }

    // Try to get from database first
    if (!year || year === 'current') {
      const driversFromDb = await prisma.driver.findMany({
        where: nationality ? { nationality } : undefined,
        // Acotado, y con NaN contemplado.
        take: acotar(limit, 50, 1, 100),
        skip: acotar(offset, 0, 0, 100_000),
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
        // El mensaje de Prisma enseña la consulta entera: se registra, no se devuelve.
        error: 'No se pudo completar la consulta.',
      },
      { status: 500 }
    );
  }
}
