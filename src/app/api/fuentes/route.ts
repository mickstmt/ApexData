import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * El marcador de la carrera entre OpenF1 y FastF1.
 *
 * Existe para poder mirarlo desde el móvil durante un fin de semana, sin abrir
 * el portátil ni entrar en la base. No enseña nada privado: nombres de sesión y
 * minutos.
 *
 * Temporal, como el experimento que lo alimenta. Ver
 * `src/lib/push/carrera-de-fuentes.ts`.
 */
export async function GET() {
  const filas = await prisma.sourceProbe.findMany({
    orderBy: [{ endedAt: 'desc' }, { source: 'asc' }],
    take: 40,
  });

  const minutos = (fin: Date, visto: Date | null) =>
    visto ? Math.round((visto.getTime() - fin.getTime()) / 60_000) : null;

  const sesiones = new Map<number, Record<string, unknown>>();

  for (const fila of filas) {
    if (!sesiones.has(fila.sessionKey)) {
      sesiones.set(fila.sessionKey, {
        sessionKey: fila.sessionKey,
        session: fila.sessionName,
        endedAt: fila.endedAt.toISOString(),
      });
    }

    // Los minutos son la respuesta; el resto está para poder desconfiar de ella.
    // `probes` dice si la medida es fina o gruesa —cada sondeo son cinco
    // minutos— y `note` qué contestó la fuente la última vez.
    sesiones.get(fila.sessionKey)![fila.source] = {
      minutes: minutos(fila.endedAt, fila.firstSeenAt),
      probes: fila.probes,
      note: fila.lastNote,
    };
  }

  const lista = [...sesiones.values()];

  /** La media de una fuente, contando solo las sesiones que ya resolvió. */
  const media = (fuente: string) => {
    const vistos = lista
      .map((s) => (s[fuente] as { minutes: number | null } | undefined)?.minutes)
      .filter((m): m is number => typeof m === 'number');

    if (!vistos.length) return null;
    return Math.round(vistos.reduce((a, b) => a + b, 0) / vistos.length);
  };

  return NextResponse.json(
    {
      medidas: lista.length,
      mediaEnMinutos: { openf1: media('openf1'), fastf1: media('fastf1') },
      sesiones: lista,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
