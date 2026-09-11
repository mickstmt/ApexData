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

/**
 * Lo que el servicio cuenta de sí mismo.
 *
 * `desde` es el dato que de verdad importa y el único que no puede quedarse
 * desactualizado: dice si un Deploy entró o si se está mirando un contenedor de
 * hace tres días. La versión hay que subirla a mano, así que vale para saber
 * **qué** corre, pero solo si alguien se acordó de tocarla.
 */
interface HuellaDelServicio {
  version?: string;
  desde?: string;
}

let ultima: { cuando: number; estado: EstadoServicio; huella: HuellaDelServicio } | null = null;

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
async function estadoDelServicio(): Promise<{
  estado: EstadoServicio;
  huella: HuellaDelServicio;
}> {
  const url = process.env.FASTF1_SERVICE_URL;
  if (!url) return { estado: 'no-configurado', huella: {} };

  if (ultima && Date.now() - ultima.cuando < VIGENCIA_MS) {
    return { estado: ultima.estado, huella: ultima.huella };
  }

  let estado: EstadoServicio = 'sin-respuesta';
  let huella: HuellaDelServicio = {};

  try {
    const respuesta = await fetch(`${url.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(ESPERA_MS),
      cache: 'no-store',
    });

    if (respuesta.ok) {
      estado = 'ok';

      // Lo que diga el servicio es un extra: si un día deja de mandarlo, el
      // estado sigue siendo válido y aquí no se cae nada.
      try {
        const cuerpo = (await respuesta.json()) as { version?: unknown; started_at?: unknown };
        huella = {
          ...(typeof cuerpo.version === 'string' ? { version: cuerpo.version } : {}),
          ...(typeof cuerpo.started_at === 'string' ? { desde: cuerpo.started_at } : {}),
        };
      } catch {
        // Un `/health` que no es JSON sigue siendo un servicio en pie.
      }
    }
  } catch (error) {
    console.error('[health] El servicio de telemetría no responde:', error);
  }

  ultima = { cuando: Date.now(), estado, huella };
  return { estado, huella };
}

export async function GET() {
  let database: 'ok' | 'error' = 'ok';

  // Las dos comprobaciones a la vez: encadenarlas sumaría la espera del
  // servicio a la de la base sin ganar nada.
  const [, servicio, ultimoAviso] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.catch((error) => {
      console.error('[health] Database unreachable:', error);
      database = 'error';
    }),
    estadoDelServicio(),
    /**
     * El último aviso que salió.
     *
     * Está aquí por la lección del GP de Países Bajos: aquella carrera se marcó
     * como avisada sin que hubiera ni una suscripción guardada, y desde fuera
     * todo se veía en verde. Un fallo de avisos no tiene síntoma —no llega
     * nada, y no llegar nada es indistinguible de un fin de semana sin
     * carrera—, así que hay que poder preguntarlo.
     */
    prisma.notifiedSession
      .findFirst({
        orderBy: { notifiedAt: 'desc' },
        select: { sessionName: true, notifiedAt: true, sent: true },
      })
      .catch(() => null),
  ]);

  const body = {
    status: database === 'ok' ? 'healthy' : 'degraded',
    buildId: BUILD_ID,
    startedAt: STARTED_AT,
    database,
    // La telemetría es opcional: la app está sana sin ella, así que su estado
    // se informa pero no decide el código de respuesta.
    telemetryService: servicio.estado,
    // Qué versión del servicio corre y desde cuándo, para no tener que abrir el
    // panel de despliegues para saber si un Deploy entró.
    telemetryVersion: servicio.huella.version ?? null,
    telemetryStartedAt: servicio.huella.desde ?? null,
    lastNotification: ultimoAviso
      ? {
          session: ultimoAviso.sessionName,
          at: ultimoAviso.notifiedAt.toISOString(),
          sent: ultimoAviso.sent,
        }
      : null,
  };

  return NextResponse.json(body, {
    status: database === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
