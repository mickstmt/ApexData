import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Health endpoint, also used by CI to confirm a deploy actually landed.
 *
 * Next writes a unique id per production build to `.next/BUILD_ID`. Reporting
 * it turns "is my code live?" into a string comparison instead of a guess from
 * uptime — a container can restart for reasons that have nothing to do with a
 * deploy, and uptime alone would read that as a successful cutover.
 *
 * Read once at module load: it cannot change while the process lives.
 */
const BUILD_ID = (() => {
  for (const candidate of [
    join(process.cwd(), '.next', 'BUILD_ID'),
    join(process.cwd(), '.next', 'standalone', '.next', 'BUILD_ID'),
  ]) {
    try {
      return readFileSync(candidate, 'utf8').trim();
    } catch {
      // Try the next location.
    }
  }

  return 'unknown';
})();

const STARTED_AT = new Date().toISOString();

export async function GET() {
  let database: 'ok' | 'error' = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error('[health] Database unreachable:', error);
    database = 'error';
  }

  const body = {
    status: database === 'ok' ? 'healthy' : 'degraded',
    buildId: BUILD_ID,
    startedAt: STARTED_AT,
    database,
    // The telemetry service is optional: the app is healthy without it.
    telemetryService: process.env.FASTF1_SERVICE_URL ? 'configured' : 'not-configured',
  };

  return NextResponse.json(body, {
    status: database === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
