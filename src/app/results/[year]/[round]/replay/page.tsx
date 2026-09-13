import { cache } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PRIMERA_TEMPORADA_CON_REPLAY } from '@/components/replay/VerReplay';
import type { PuestoOficial } from '@/lib/replay/final';
import { ReplayClient } from './ReplayClient';

/**
 * El replay de una carrera: los veinte coches sobre el circuito, como se vio.
 *
 * Es una pantalla propia y no un gráfico más de `/analysis` porque necesita
 * la pantalla entera —mapa, torre y mandos— y porque desde la ficha de la
 * carrera es desde donde uno quiere verla. La ficha sigue como está; esto
 * cuelga de ella.
 *
 * La carrera se comprueba en la base antes de nada: si no existe es un 404 de
 * verdad, antes de que nada empiece a transmitirse. Los datos de posición no
 * salen de aquí sino del servicio de telemetría, que los sirve el navegador
 * pidiéndolos por `/api/positions`.
 */

// Como la ficha: cambia una vez por carrera, y así no se va a Virginia en
// cada visita.
export const revalidate = 3600;

interface ReplayPageProps {
  params: Promise<{ year: string; round: string }>;
  /** `?sesion=S` abre el sprint; cualquier otra cosa, la carrera. */
  searchParams: Promise<{ sesion?: string }>;
}

/**
 * Envuelto en `cache`: `generateMetadata` y la página piden lo mismo.
 *
 * Sin esto son DOS consultas por visita para el mismo registro. Da igual en
 * local y no da igual donde importa: el servidor de pruebas comparte UNA
 * conexión a la base y cada consulta cuesta ~500 ms contra Virginia, así que
 * cada viaje de más se le suma a todo lo demás que esté esperando turno.
 */
const carreraDe = cache(async (year: number, round: number) => {
  if (!Number.isInteger(year) || !Number.isInteger(round)) return null;

  return prisma.race.findUnique({
    where: { year_round: { year, round } },
    select: {
      raceName: true,
      sprintDate: true,
      circuit: { select: { name: true, location: true } },
    },
  });
});

/**
 * La clasificación oficial: quién va en cada puesto y con qué tiempo.
 *
 * El replay ordena por metros recorridos y eso deja de valer en la vuelta de
 * celebración; al caer la bandera manda esto, que es lo único que sabe de
 * sanciones. En Hungría 2026 HAM cruzó la meta antes que LEC y sin embargo
 * LEC es cuarto.
 *
 * `positionOrder` y no `position`: incluye a los retirados, que también
 * ocupan un puesto en la clasificación. Si la carrera todavía no tiene
 * resultados —acaba de terminar— se devuelve `null` y el replay se apaña con
 * los cruces de meta.
 */
async function ordenOficialDe(
  year: number,
  round: number,
  sesion: 'R' | 'S'
): Promise<PuestoOficial[] | null> {
  const where = { race: { year, round } } as const;
  const select = { time: true, driver: { select: { code: true } } } as const;
  const orderBy = { positionOrder: 'asc' } as const;

  const filas =
    sesion === 'S'
      ? await prisma.sprintResult.findMany({ where, select, orderBy })
      : await prisma.result.findMany({ where, select, orderBy });

  const puestos = filas
    .filter((f) => Boolean(f.driver.code))
    .map((f) => ({ code: f.driver.code as string, tiempo: f.time }));

  return puestos.length ? puestos : null;
}

export async function generateMetadata({ params }: ReplayPageProps) {
  const { year, round } = await params;
  const carrera = await carreraDe(Number(year), Number(round));

  return {
    title: carrera ? `Replay · ${carrera.raceName} ${year} | ApexData` : 'Replay | ApexData',
    description: carrera
      ? `La carrera del ${carrera.raceName} ${year}, coche a coche sobre el circuito.`
      : 'El replay de una carrera de Fórmula 1.',
  };
}

export default async function ReplayPage({ params, searchParams }: ReplayPageProps) {
  const { year, round } = await params;
  const anio = Number(year);
  const ronda = Number(round);

  const carrera = await carreraDe(anio, ronda);
  if (!carrera) notFound();

  const { sesion } = await searchParams;
  // El sprint solo si el fin de semana lo tuvo: `?sesion=S` en uno sin sprint
  // abre la carrera, en vez de pedirle al servicio una sesión que no existe.
  const sesionElegida: 'R' | 'S' = sesion === 'S' && carrera.sprintDate ? 'S' : 'R';
  const ordenOficial = await ordenOficialDe(anio, ronda, sesionElegida);

  return (
    <ReplayClient
      year={anio}
      round={ronda}
      sesion={sesionElegida}
      ordenOficial={ordenOficial}
      nombre={carrera.raceName}
      circuito={carrera.circuit.name}
      disponible={anio >= PRIMERA_TEMPORADA_CON_REPLAY}
    />
  );
}
