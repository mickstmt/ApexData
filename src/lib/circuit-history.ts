import { prisma } from '@/lib/prisma';
import type { VictoriaEnCircuito } from '@/lib/circuit-stats';

/**
 * La consulta del historial de un circuito.
 *
 * Separada de `circuit-stats.ts` —que es puro— porque este módulo importa
 * Prisma: cualquier componente de cliente que tocara este archivo se llevaría
 * el cliente de la base al navegador.
 */

export interface FichaDeCircuito {
  circuitId: string;
  name: string;
  location: string;
  country: string;
  lat: number | null;
  lng: number | null;
  alt: number | null;
  url: string | null;
  imageUrl: string | null;
  /** Todas las carreras celebradas aquí, incluidas las que aún no tienen resultados. */
  carreras: number;
  primera: number | null;
  ultima: number | null;
  victorias: VictoriaEnCircuito[];
}

export async function getCircuitHistory(circuitId: string): Promise<FichaDeCircuito | null> {
  const circuito = await prisma.circuit.findUnique({
    where: { circuitId },
    select: {
      circuitId: true,
      name: true,
      location: true,
      country: true,
      lat: true,
      lng: true,
      alt: true,
      url: true,
      imageUrl: true,
      _count: { select: { races: true } },
      races: { orderBy: { year: 'asc' }, select: { year: true } },
    },
  });

  if (!circuito) return null;

  // Solo el ganador de cada carrera sale de la base: pedir los resultados
  // enteros de dieciséis carreras para quedarse con la primera fila de cada
  // una son veinte veces más filas cruzando el Atlántico.
  const ganadores = await prisma.result.findMany({
    where: { position: 1, race: { circuitId } },
    // Con el año a secas, las dos carreras de un doblete pueden salir en
    // cualquier orden entre visitas: la ronda las fija.
    orderBy: [{ race: { year: 'desc' } }, { race: { round: 'desc' } }],
    select: {
      grid: true,
      time: true,
      race: { select: { year: true, round: true, raceName: true } },
      driver: { select: { driverId: true, givenName: true, familyName: true } },
      team: { select: { constructorId: true, name: true } },
    },
  });

  const años = circuito.races.map((r) => r.year);

  return {
    circuitId: circuito.circuitId,
    name: circuito.name,
    location: circuito.location,
    country: circuito.country,
    lat: circuito.lat,
    lng: circuito.lng,
    alt: circuito.alt,
    url: circuito.url,
    imageUrl: circuito.imageUrl,
    carreras: circuito._count.races,
    primera: años[0] ?? null,
    ultima: años[años.length - 1] ?? null,
    victorias: ganadores.map((g) => ({
      year: g.race.year,
      round: g.race.round,
      raceName: g.race.raceName,
      driverId: g.driver.driverId,
      driver: `${g.driver.givenName} ${g.driver.familyName}`,
      teamId: g.team.constructorId,
      team: g.team.name,
      grid: g.grid,
      time: g.time,
    })),
  };
}
