import { Star } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { FavoritesGrid } from '@/components/favorites/FavoritesGrid';
import { EquipoAcento, type EquipoElegible } from '@/components/favorites/EquipoAcento';

export const metadata = {
  title: 'Favoritos | ApexData',
  description: 'Tus pilotos y equipos favoritos de Fórmula 1',
};

// Se cachean los datos, no la página: los equipos de la temporada cambian una
// vez al año, y así el build no consulta la base —que en el CI no existe—.
export const dynamic = 'force-dynamic';

/** Los equipos de la última temporada con resultados, no una lista a mano. */
const getEquiposActuales = unstable_cache(
  async (): Promise<EquipoElegible[]> => {
    const ultima = await prisma.race.findFirst({
      where: { results: { some: {} } },
      orderBy: [{ year: 'desc' }, { round: 'desc' }],
      select: { year: true },
    });

    if (!ultima) return [];

    const resultados = await prisma.result.findMany({
      where: { race: { year: ultima.year } },
      select: { team: { select: { constructorId: true, name: true } } },
      distinct: ['constructorId'],
    });

    return resultados
      .map((r) => r.team)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  },
  ['equipos-temporada-actual'],
  { revalidate: 3600 }
);

export default async function FavoritesPage() {
  let equipos: EquipoElegible[] = [];

  try {
    equipos = await getEquiposActuales();
  } catch (error) {
    console.error('Error fetching teams:', error);
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <Star className="h-8 w-8 fill-primary stroke-primary" />
          <h1 className="text-4xl font-bold md:text-5xl">
            Mis <span className="text-primary">Favoritos</span>
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Acceso rápido a tus pilotos y equipos favoritos
        </p>
      </div>

      {equipos.length > 0 && <EquipoAcento equipos={equipos} />}

      {/* Favorites Grid */}
      <FavoritesGrid />
    </div>
  );
}
