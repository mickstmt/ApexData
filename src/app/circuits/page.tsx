import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  BuscadorDeCircuitos,
  type CircuitoDeLaLista,
} from '@/components/circuits/BuscadorDeCircuitos';

export const metadata = {
  title: 'Circuitos | ApexData',
  description: 'Trazados, ubicación e historial de los circuitos del Mundial de Fórmula 1.',
};

// Se cachean los DATOS, no la página. Marcarla como estática con
// `revalidate` la hacía consultar la base durante el build, y el build no
// tiene base de datos: el CI construye con credenciales falsas a propósito, y
// la página se habría horneado con el contenido de reserva. Con la página
// dinámica y la consulta en `unstable_cache`, Supabase recibe una consulta por
// hora en vez de una por visita, y el build no toca la base.
export const dynamic = 'force-dynamic';

// Only a count and the latest year are needed, so the race rows themselves
// never leave the database.
const getCircuits = unstable_cache(
  () =>
    prisma.circuit.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { races: true } },
        races: { orderBy: { year: 'desc' }, take: 1, select: { year: true } },
      },
    }),
  ['circuits-with-race-counts'],
  { revalidate: 3600 }
);

export default async function CircuitsPage() {
  let circuits: CircuitoDeLaLista[] = [];
  let hasError = false;

  try {
    const rows = await getCircuits();

    circuits = rows.map((circuit) => ({
      id: circuit.id,
      circuitId: circuit.circuitId,
      name: circuit.name,
      location: circuit.location,
      country: circuit.country,
      imageUrl: circuit.imageUrl,
      races: circuit._count.races,
      lastYear: circuit.races[0]?.year ?? null,
    }));
  } catch (error) {
    console.error('Error fetching circuits:', error);
    hasError = true;
  }

  // Los que se corren hoy primero; el resto detrás. El orden se decide aquí y
  // no en la consulta —que pide por nombre— porque lo que interesa arriba es
  // la actualidad, no el alfabeto.
  const sorted = [...circuits].sort((a, b) => (b.lastYear ?? 0) - (a.lastYear ?? 0));
  const conDatos = sorted.filter((c) => c.races > 0).length;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-6">
        <h1 className="mb-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Circuitos
        </h1>
        <p className="text-muted-foreground">
          {hasError
            ? 'No se pudo cargar la lista de circuitos.'
            : /* Se dice el reparto y no un total redondo: de los 55, 19 no
                 tienen ni una carrera en la base porque los resultados
                 arrancan en 2010. Fingir 55 «registrados» era la misma
                 promesa rota que el «0 carreras» de cada tarjeta. */
              `${conDatos} con resultados · ${sorted.length - conDatos} solo el trazado`}
        </p>
      </div>

      {sorted.length > 0 && <BuscadorDeCircuitos circuitos={sorted} />}
    </div>
  );
}
