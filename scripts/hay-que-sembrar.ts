/**
 * ¿Acaba de terminar una sesión cuyos datos aún no tenemos?
 *
 * Esto es lo que sustituye a sembrar «los lunes por si acaso». La base ya sabe
 * a qué hora corre cada sesión, así que el trabajo se dispara por esas horas y
 * no por el calendario: en una semana de descanso, en el parón de verano o un
 * martes cualquiera, este guion mira una vez la base y se va sin gastar una
 * sola petición.
 *
 * No siembra: **decide**. Escribe su veredicto en la salida del paso para que
 * el propio flujo de trabajo llame a los sembradores de siempre, que ya están
 * probados. Separar decisión de acción también permite ejecutarlo a mano para
 * ver qué haría sin que haga nada.
 *
 * Uso:
 *   npx tsx scripts/hay-que-sembrar.ts
 */

import 'dotenv/config';
import { appendFileSync } from 'node:fs';
import { prisma } from '../src/lib/prisma';
import { comienzoDeCarrera } from '../src/lib/sesiones';

/**
 * Cuánto dura cada sesión, para saber cuándo terminó.
 *
 * Solo se usan las tres que publica Jolpica: de las prácticas y de la
 * clasificación al sprint no hay resultados que traer por esta vía —Ergast
 * nunca los tuvo—, así que esperar por ellas sería esperar por nada.
 */
const SESIONES = [
  { nombre: 'Clasificación', minutos: 60 },
  { nombre: 'Sprint', minutos: 45 },
  { nombre: 'Carrera', minutos: 150 },
] as const;

/**
 * Hasta cuándo se mira hacia atrás.
 *
 * Dos días: si el disparador falla una noche entera o la fuente tarda más de lo
 * normal, el siguiente intento sigue encontrando la sesión pendiente. Más allá
 * de eso ya no es «acaba de terminar» y lo recoge el sembrado semanal.
 *
 * Se puede ampliar con `VENTANA_HORAS` para comprobar a mano qué haría con
 * carreras más antiguas, que es la única forma de probar la detección fuera de
 * un fin de semana de carrera.
 */
const VENTANA_HORAS = Number(process.env.VENTANA_HORAS ?? 48);

export interface CarreraParaRevisar {
  year: number;
  round: number;
  raceName: string;
  /** Medianoche UTC; la hora real va en `time`. */
  date: Date;
  time: string | null;
  qualiDate: Date | null;
  sprintDate: Date | null;
  resultados: number;
  clasificaciones: number;
  sprints: number;
}

export interface SesionRevisada {
  carrera: string;
  year: number;
  round: number;
  sesion: string;
  horasDesdeQueTermino: number;
  tenemos: number;
}


/**
 * Las sesiones que ya terminaron dentro de la ventana, con lo que tenemos de
 * cada una. Es toda la decisión, y por eso vive aparte de la base: así se puede
 * probar el caso que de verdad importa —que note lo que falta— sin esperar a un
 * fin de semana de carrera.
 */
export function sesionesRevisables(
  carreras: CarreraParaRevisar[],
  ahora: number,
  ventanaHoras: number
): SesionRevisada[] {
  const revisadas: SesionRevisada[] = [];

  for (const carrera of carreras) {
    const momentos = [
      { ...SESIONES[0], cuando: carrera.qualiDate, tenemos: carrera.clasificaciones },
      { ...SESIONES[1], cuando: carrera.sprintDate, tenemos: carrera.sprints },
      {
        ...SESIONES[2],
        cuando: comienzoDeCarrera(carrera.date, carrera.time),
        tenemos: carrera.resultados,
      },
    ];

    for (const sesion of momentos) {
      if (!sesion.cuando) continue;

      const termino = sesion.cuando.getTime() + sesion.minutos * 60_000;
      const horas = (ahora - termino) / 3_600_000;

      // Todavía no ha acabado, o quedó fuera de la ventana.
      if (horas < 0 || horas > ventanaHoras) continue;

      revisadas.push({
        carrera: carrera.raceName,
        year: carrera.year,
        round: carrera.round,
        sesion: sesion.nombre,
        horasDesdeQueTermino: horas,
        tenemos: sesion.tenemos,
      });
    }
  }

  return revisadas;
}

async function main() {
  const desde = new Date(Date.now() - VENTANA_HORAS * 3_600_000);

  const carreras = await prisma.race.findMany({
    where: {
      OR: [
        { date: { gte: desde } },
        { qualiDate: { gte: desde } },
        { sprintDate: { gte: desde } },
      ],
    },
    orderBy: [{ year: 'desc' }, { round: 'desc' }],
    select: {
      year: true,
      round: true,
      raceName: true,
      date: true,
      time: true,
      qualiDate: true,
      sprintDate: true,
      _count: { select: { results: true, qualifyings: true, sprintResults: true } },
    },
  });

  if (carreras.length === 0) {
    console.log('No hay ninguna carrera en la ventana de las últimas 48 horas.');
    return decidir(false);
  }

  const revisadas = sesionesRevisables(
    carreras.map((c) => ({
      year: c.year,
      round: c.round,
      raceName: c.raceName,
      date: c.date,
      time: c.time,
      qualiDate: c.qualiDate,
      sprintDate: c.sprintDate,
      resultados: c._count.results,
      clasificaciones: c._count.qualifyings,
      sprints: c._count.sprintResults,
    })),
    Date.now(),
    VENTANA_HORAS
  );

  let faltaAlgo = false;
  let año = 0;

  for (const revisada of revisadas) {
    // El registro de cuánto tarda cada fuente en publicar. Con dos o tres
    // carreras deja de ser una suposición y se convierte en un dato.
    const estado = revisada.tenemos > 0 ? `YA están (${revisada.tenemos} filas)` : 'AÚN no están';
    console.log(
      `${revisada.year} R${revisada.round} ${revisada.carrera} · ${revisada.sesion}: ` +
        `terminó hace ${revisada.horasDesdeQueTermino.toFixed(1)} h · sus datos ${estado}`
    );

    if (revisada.tenemos === 0) {
      faltaAlgo = true;
      año = revisada.year;
    }
  }

  if (!faltaAlgo) {
    console.log('\nTodo lo que ha terminado ya está sembrado: no hay nada que hacer.');
    return decidir(false);
  }

  console.log(`\nFalta sembrar la temporada ${año}.`);
  return decidir(true, año);
}

function decidir(sembrar: boolean, año?: number) {
  const salida = process.env.GITHUB_OUTPUT;
  if (!salida) return;

  appendFileSync(salida, `sembrar=${sembrar}\n`);
  if (año) appendFileSync(salida, `anio=${año}\n`);
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
