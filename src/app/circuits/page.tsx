import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { CountryFlag } from '@/components/ui/CountryFlag';

export const metadata = {
  title: 'Circuitos | ApexData',
  description: 'Trazados, ubicación e historial de los circuitos del Mundial de Fórmula 1.',
};

// Los datos de esta página cambian como mucho una vez por carrera, así que
// una hora de caché evita ir a Virginia en cada visita sin que nadie note
// nunca un dato viejo.
export const revalidate = 3600;

export default async function CircuitsPage() {
  let circuits: Array<{
    id: string;
    circuitId: string;
    name: string;
    location: string;
    country: string;
    imageUrl: string | null;
    races: number;
    lastYear: number | null;
  }> = [];
  let hasError = false;

  try {
    // Only a count and the latest year are needed, so the race rows themselves
    // never leave the database.
    const rows = await prisma.circuit.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { races: true } },
        races: { orderBy: { year: 'desc' }, take: 1, select: { year: true } },
      },
    });

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

  // Venues with a layout and recent use lead; the rest still appear below.
  const sorted = [...circuits].sort((a, b) => (b.lastYear ?? 0) - (a.lastYear ?? 0));

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="mb-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Circuitos
        </h1>
        <p className="text-muted-foreground">
          {hasError
            ? 'No se pudo cargar la lista de circuitos.'
            : `${circuits.length} trazados registrados en el Mundial.`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((circuit) => (
          <Card
            key={circuit.id}
            className="flex flex-col overflow-hidden transition-colors hover:border-primary"
          >
            <div className="flex h-36 items-center justify-center bg-muted/40 p-4">
              {circuit.imageUrl ? (
                <Image
                  src={circuit.imageUrl}
                  alt={`Trazado de ${circuit.name}`}
                  width={260}
                  height={130}
                  // The layouts are dark line art, so they invert for dark mode.
                  className="h-full w-auto object-contain opacity-90 dark:invert"
                />
              ) : (
                <MapPin className="h-10 w-10 text-muted-foreground/40" aria-hidden />
              )}
            </div>

            <div className="flex flex-1 flex-col gap-1 p-4">
              <div className="flex items-center gap-2">
                <CountryFlag country={circuit.country} size={18} />
                <span className="truncate text-sm text-muted-foreground">{circuit.location}</span>
              </div>

              <h2 className="font-display text-lg font-semibold leading-tight">{circuit.name}</h2>

              <div className="mt-auto flex items-center justify-between pt-2 text-sm text-muted-foreground">
                <span className="tabular-nums">
                  {circuit.races} {circuit.races === 1 ? 'carrera' : 'carreras'}
                </span>
                {circuit.lastYear && (
                  <Link
                    href={`/calendar?season=${circuit.lastYear}`}
                    className="tabular-nums hover:text-foreground"
                  >
                    última: {circuit.lastYear}
                  </Link>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
