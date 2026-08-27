import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BUILD_ID } from '@/lib/build-id';

export const dynamic = 'force-dynamic';

/**
 * Health endpoint, also used by CI to confirm a deploy actually landed.
 *
 * `BUILD_ID` vive en `@/lib/build-id`: lo comparten este endpoint, el rastro de
 * arranque de `instrumentation.ts` y `/api/version`, que es de donde el service
 * worker saca el nombre de sus cachés.
 */
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
