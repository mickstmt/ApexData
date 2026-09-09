import { prisma } from '@/lib/prisma';
import type { SesionOpenF1 } from '@/services/openf1/tipos';

/**
 * El Gran Premio al que pertenece una sesión, en la base de datos.
 *
 * Se busca por cercanía de fechas y no por identificador: OpenF1 numera sus
 * reuniones con una clave propia (`meeting_key`) que no existe en nuestra base,
 * y añadirla obligaría a resembrar diecisiete temporadas para ganar nada. Un
 * fin de semana cabe en cuatro días, así que la carrera más cercana a la sesión
 * es la suya sin ambigüedad posible.
 */
export async function granPremioDe(sesion: SesionOpenF1) {
  const inicio = new Date(sesion.date_start);
  const margen = 5 * 24 * 60 * 60 * 1000;

  const candidatas = await prisma.race.findMany({
    where: {
      year: sesion.year,
      date: {
        gte: new Date(inicio.getTime() - margen),
        lte: new Date(inicio.getTime() + margen),
      },
    },
    select: { year: true, round: true, raceName: true, date: true },
  });

  if (!candidatas.length) return null;

  return candidatas.reduce((mejor, actual) =>
    Math.abs(actual.date.getTime() - inicio.getTime()) <
    Math.abs(mejor.date.getTime() - inicio.getTime())
      ? actual
      : mejor
  );
}
