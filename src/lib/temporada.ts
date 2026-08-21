import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Qué temporada enseñar cuando nadie ha pedido ninguna.
 *
 * Estaba escrito a mano —`params.season ? … : 2024`— en pilotos, equipos y
 * resultados, de cuando 2024 era la temporada en curso. Dos años después, esas
 * tres páginas seguían abriendo en 2024 sin que nada lo dijera. La clasificación
 * usaba el año del reloj, que tampoco vale: en enero, con el mundial aún sin
 * empezar, habría enseñado una temporada vacía.
 *
 * La respuesta correcta es **la última temporada con resultados**: hoy 2026, en
 * enero todavía la anterior, y el día que se corra la primera carrera del año
 * nuevo cambia sola. Nadie tiene que acordarse de nada.
 *
 * El calendario no usa esto a propósito: ahí sí se quiere el año en curso
 * aunque no haya corrido nadie, porque lo que se va a mirar son las carreras
 * que vienen.
 */
export const temporadaPorDefecto = unstable_cache(
  async (): Promise<number> => {
    try {
      const ultima = await prisma.race.findFirst({
        where: { results: { some: {} } },
        orderBy: [{ year: 'desc' }, { round: 'desc' }],
        select: { year: true },
      });

      return ultima?.year ?? new Date().getFullYear();
    } catch (error) {
      // Sin base de datos, el año del reloj: la página ya sabe enseñar su
      // estado vacío, y esto no puede ser el motivo de que reviente.
      console.error('[temporada] No se pudo leer la última temporada:', error);
      return new Date().getFullYear();
    }
  },
  ['temporada-por-defecto'],
  { revalidate: 3600 }
);
