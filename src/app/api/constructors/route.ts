/**
 * API Route: /api/constructors
 * Get all F1 constructors/teams
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

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const nationality = searchParams.get('nationality');

    // Ver la nota de /api/drivers: los favoritos se piden por identificador.
    const ids = searchParams.get('ids');

    if (ids) {
      const constructorIds = ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 100);

      const favorites = await prisma.team.findMany({
        where: { constructorId: { in: constructorIds } },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({
        success: true,
        data: favorites,
        source: 'database',
      });
    }

    // Try database first
    if (!year || year === 'current') {
      const constructorsFromDb = await prisma.team.findMany({
        where: nationality ? { nationality } : undefined,
        // Acotado, y con NaN contemplado.
        take: acotar(limit, 50, 1, 100),
        skip: acotar(offset, 0, 0, 100_000),
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
        // El mensaje de Prisma enseña la consulta entera: se registra, no se devuelve.
        error: 'No se pudo completar la consulta.',
      },
      { status: 500 }
    );
  }
}
