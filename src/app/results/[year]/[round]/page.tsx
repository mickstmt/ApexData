import RaceDetailClient from './RaceDetailClient';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

interface RaceResultPageProps {
  params: Promise<{
    year: string;
    round: string;
  }>;
}

export async function generateMetadata({ params }: RaceResultPageProps) {
  const { year, round } = await params;
  return {
    title: `Resultados ${year} - Round ${round} | ApexData`,
    description: `Resultados completos de la carrera Round ${round} de la temporada ${year}`,
  };
}

export default async function RaceResultPage({ params }: RaceResultPageProps) {
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
          constructor: true,
        },
        orderBy: {
          positionOrder: 'asc',
        },
      },
      qualifying: {
        include: {
          driver: true,
          constructor: true,
        },
        orderBy: {
          position: 'asc',
        },
      },
    },
  });

  if (!race) {
    notFound();
  }

  return <RaceDetailClient race={race} year={yearNum} />;
}
