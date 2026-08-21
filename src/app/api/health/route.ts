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

/** Estados posibles del microservicio de telemetría. */
type EstadoServicio = 'ok' | 'sin-respuesta' | 'no-configurado';

/** Cuánto vale una comprobación antes de repetirla. */
const VIGENCIA_MS = 30_000;

/** Lo que se espera al servicio antes de darlo por caído. */
const ESPERA_MS = 2_000;

let ultima: { cuando: number; estado: EstadoServicio } | null = null;

/**
 * Le pregunta al servicio de telemetría si está en pie.
 *
 * Antes este campo solo decía si **la variable de entorno existía**, que no es
 * lo mismo que si el servicio responde: con el servicio caído, `/health` seguía
 * contestando «configured» tan tranquilo. Y como el servicio no tiene dominio
 * —se decidió el 2026-08-18 dejarlo dentro de la red del VPS—, esta es la única
 * forma de saber desde fuera si está vivo.
 *
 * Con espera corta y resultado guardado medio minuto: este endpoint lo consulta
 * el CI en cada despliegue y no puede tardar lo que tarde el servicio, ni
 * convertirse en una forma de martillearlo.
 */
async function estadoDelServicio(): Promise<EstadoServicio> {
  const url = process.env.FASTF1_SERVICE_URL;
  if (!url) return 'no-configurado';

  if (ultima && Date.now() - ultima.cuando < VIGENCIA_MS) return ultima.estado;

  let estado: EstadoServicio = 'sin-respuesta';

  try {
    const respuesta = await fetch(`${url.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(ESPERA_MS),
      cache: 'no-store',
    });
    if (respuesta.ok) estado = 'ok';
  } catch (error) {
    console.error('[health] El servicio de telemetría no responde:', error);
  }

  ultima = { cuando: Date.now(), estado };
  return estado;
}

export async function GET() {
  let database: 'ok' | 'error' = 'ok';

  // Las dos comprobaciones a la vez: encadenarlas sumaría la espera del
  // servicio a la de la base sin ganar nada.
  const [, telemetryService] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.catch((error) => {
      console.error('[health] Database unreachable:', error);
      database = 'error';
    }),
    estadoDelServicio(),
  ]);

  const body = {
    status: database === 'ok' ? 'healthy' : 'degraded',
    buildId: BUILD_ID,
    startedAt: STARTED_AT,
    database,
    // La telemetría es opcional: la app está sana sin ella, así que su estado
    // se informa pero no decide el código de respuesta.
    telemetryService,
  };

  return NextResponse.json(body, {
    status: database === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
