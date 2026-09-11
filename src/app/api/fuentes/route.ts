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

  // En segundos, no en minutos. Redondear a minutos era parte del problema: si
  // una fuente publica cuarenta segundos antes que la otra, redondeado empatan.
  const segundos = (fin: Date, visto: Date | null) =>
    visto ? Math.round((visto.getTime() - fin.getTime()) / 1000) : null;

  const reloj = (s: number | null) => {
    if (s === null) return null;
    // El signo delante y las cuentas sobre el valor absoluto: sin esto, un
    // negativo salía como «-1m -45s», porque `padStart` no rellena una cadena
    // que ya empieza por el guion. Pasa si OpenF1 corrige el `date_end` de una
    // sesión hacia adelante, que se reescribe en cada sondeo.
    const signo = s < 0 ? '-' : '';
    const abs = Math.abs(s);
    return `${signo}${Math.floor(abs / 60)}m ${String(abs % 60).padStart(2, '0')}s`;
  };

  const sesiones = new Map<number, Record<string, unknown>>();

  for (const fila of filas) {
    if (!sesiones.has(fila.sessionKey)) {
      sesiones.set(fila.sessionKey, {
        sessionKey: fila.sessionKey,
        session: fila.sessionName,
        endedAt: fila.endedAt.toISOString(),
      });
    }

    // Los segundos son la respuesta; el resto está para poder desconfiar de
    // ella. `firstProbe` dice cuándo empezamos a preguntar —si eso no es casi
    // cero, la medida no vale y la culpa es nuestra—, `probes` cuántas veces se
    // preguntó y `note` qué contestó la última vez.
    const s = segundos(fila.endedAt, fila.firstSeenAt);

    sesiones.get(fila.sessionKey)![fila.source] = {
      seconds: s,
      clock: reloj(s),
      firstProbe: reloj(segundos(fila.endedAt, fila.firstProbeAt)),
      probes: fila.probes,
      note: fila.lastNote,
    };
  }

  const lista = [...sesiones.values()];

  /** La media de una fuente, contando solo las sesiones que ya resolvió. */
  const media = (fuente: string) => {
    const vistos = lista
      .map((s) => (s[fuente] as { seconds: number | null } | undefined)?.seconds)
      .filter((m): m is number => typeof m === 'number');

    if (!vistos.length) return null;
    return Math.round(vistos.reduce((a, b) => a + b, 0) / vistos.length);
  };

  /**
   * Quién gana, dicho solo cuando se puede decir.
   *
   * Con una sola sesión medida no hay veredicto, y una diferencia menor que la
   * resolución del sondeo tampoco: a FastF1 se le pregunta cada dos minutos
   * —cada pregunta le cuesta doce segundos al servicio—, así que por debajo de
   * eso no se puede distinguir quién fue antes. Es preferible «todavía no se
   * sabe» a un ganador inventado.
   */
  const RESOLUCION_SEGUNDOS = 120;

  const veredicto = () => {
    // Solo las sesiones que resolvieron LAS DOS.
    //
    // Comparar dos medias sobre conjuntos distintos es comparar cosas
    // distintas: a una fuente que solo resuelve las sesiones fáciles le sale
    // mejor media y se la declara ganadora por no haber contestado a las
    // difíciles. Y contar filas de la tabla en vez de parejas medidas hacía
    // que «tres sesiones» pudieran ser tres a medias.
    const pares = lista.filter(
      (s) =>
        typeof (s.openf1 as { seconds?: unknown } | undefined)?.seconds === 'number' &&
        typeof (s.fastf1 as { seconds?: unknown } | undefined)?.seconds === 'number'
    );

    const medioDe = (fuente: string) =>
      pares.length
        ? pares.reduce((suma, s) => suma + ((s[fuente] as { seconds: number }).seconds ?? 0), 0) /
          pares.length
        : null;

    const a = medioDe('openf1');
    const b = medioDe('fastf1');

    if (a === null || b === null) return 'ninguna sesión medida por las dos todavía';
    if (pares.length < 3) return `solo ${pares.length} sesión(es) medida(s) por las dos: pocas para concluir`;
    if (Math.abs(a - b) <= RESOLUCION_SEGUNDOS)
      return `empate dentro de la resolución del sondeo (${RESOLUCION_SEGUNDOS} s)`;

    return a < b ? 'openf1 publica antes' : 'fastf1 publica antes';
  };

  return NextResponse.json(
    {
      medidas: lista.length,
      veredicto: veredicto(),
      mediaEnSegundos: { openf1: media('openf1'), fastf1: media('fastf1') },
      sesiones: lista,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
