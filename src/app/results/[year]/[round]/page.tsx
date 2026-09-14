import RaceDetailClient from './RaceDetailClient';
import { directorioDePilotos } from '@/lib/parrilla';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

// Los datos de esta página cambian como mucho una vez por carrera, así que
// una hora de caché evita ir a Virginia en cada visita sin que nadie note
// nunca un dato viejo.
export const revalidate = 3600;

interface RaceResultPageProps {
  params: Promise<{
    year: string;
    round: string;
  }>;
  /** `?sesion=` abre directamente esa pestaña: es a donde apuntan los enlaces
      de la portada, para que tocar «Sprint» no te deje en la carrera. */
  searchParams: Promise<{ sesion?: string }>;
}

export async function generateMetadata({ params }: RaceResultPageProps) {
  const { year, round } = await params;
  return {
    title: `Resultados ${year} - Round ${round} | ApexData`,
    description: `Resultados completos de la carrera Round ${round} de la temporada ${year}`,
  };
}

export default async function RaceResultPage({ params, searchParams }: RaceResultPageProps) {
  const { year, round } = await params;
  const yearNum = parseInt(year);
  const roundNum = parseInt(round);

  // Obtener la carrera con todos sus resultados
  const race = await prisma.race.findUnique({
    where: {
      year_round: {
        year: yearNum,
        round: roundNum,
      },
    },
    include: {
      circuit: true,
      results: {
        include: {
          driver: true,
          team: true,
        },
        orderBy: {
          positionOrder: 'asc',
        },
      },
      qualifyings: {
        include: {
          driver: true,
          team: true,
        },
        orderBy: {
          position: 'asc',
        },
      },
      // Estaban guardados desde el principio —528 filas, 22 por sprint— y la
      // página no los pedía: la pestaña del sprint enseñaba «En desarrollo»
      // sobre datos que ya existían.
      sprintResults: {
        include: {
          driver: true,
          team: true,
        },
        orderBy: {
          positionOrder: 'asc',
        },
      },
    },
  });

  if (!race) {
    notFound();
  }

  const { sesion } = await searchParams;

  /**
   * Quien es cada piloto, por sus tres letras.
   *
   * Las pestañas de practicas y de clasificacion al sprint vienen de FastF1,
   * que solo manda el codigo. Sin este cruce esas tablas salen sin foto, sin
   * dorsal, sin bandera y con «VER» por nombre — el punto 46.
   *
   * Se arma aqui, en el servidor, con lo que ya se ha traido de esta carrera y
   * una consulta corta de respaldo para el viernes, cuando la carrera aun no ha
   * corrido y por tanto no hay resultados de los que sacarlo.
   */
  const directorio = await directorioDePilotos(yearNum, [
    ...race.results,
    ...race.qualifyings,
    ...race.sprintResults,
  ]);

  return (
    <RaceDetailClient
      race={race}
      year={yearNum}
      sesionInicial={sesion}
      directorio={directorio}
    />
  );
}
