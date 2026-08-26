/**
 * Rellena el horario del fin de semana en las temporadas que no lo tienen.
 *
 * ## Por qué existe aparte de `season.ts`
 *
 * Los horarios de las sesiones —prácticas, clasificación, sprint— sólo viajan
 * en el endpoint del calendario, y `upsertRace` ya los escribe cuando vienen
 * (ver el comentario de `jolpica.ts`). Pero `seed:season` siembra además
 * resultados, clasificaciones y sprints: unas sesenta peticiones por temporada
 * para actualizar un dato que llega en la primera.
 *
 * Medido: sembrar catorce temporadas enteras iba por seis carreras en un cuarto
 * de hora. Pidiendo sólo el calendario son **catorce peticiones**.
 *
 * ## Por qué había que rellenarlo
 *
 * De las diecisiete temporadas de la base, sólo tres tenían horario: 2022, 2025
 * y 2026. No era una limitación de la fuente —se comprobó una por una que la
 * API los publica desde 2010—, sino que esas temporadas se sembraron antes de
 * que el guion pidiera los horarios.
 *
 * Uso: npx tsx scripts/seed/horarios.ts [año...] | --faltantes | --listar
 */

import { PrismaClient } from '@prisma/client';
import { fetchJolpica, upsertRace, type JolpicaRace } from './jolpica';

const prisma = new PrismaClient();

interface RespuestaCalendario {
  MRData: { RaceTable: { Races: JolpicaRace[] } };
}

/** Si una fecha de sesión lleva hora dentro, y no es medianoche por defecto. */
const tieneHora = (fecha: Date | null) =>
  fecha !== null && (fecha.getUTCHours() !== 0 || fecha.getUTCMinutes() !== 0);

/** Las temporadas de la base a las que les falta el horario. */
async function temporadasSinHorario(): Promise<number[]> {
  const carreras = await prisma.race.findMany({ select: { year: true, qualiDate: true } });

  const porAño = new Map<number, { total: number; conHorario: number }>();
  for (const carrera of carreras) {
    const cuenta = porAño.get(carrera.year) ?? { total: 0, conHorario: 0 };
    cuenta.total += 1;
    if (tieneHora(carrera.qualiDate)) cuenta.conHorario += 1;
    porAño.set(carrera.year, cuenta);
  }

  // Se piden las que no lo tienen del todo: una temporada a medias también
  // conviene rehacerla, y cuesta una sola petición.
  return [...porAño.entries()]
    .filter(([, cuenta]) => cuenta.conHorario < cuenta.total)
    .map(([año]) => año)
    .sort((a, b) => a - b);
}

async function sembrarCalendario(año: number) {
  const datos = await fetchJolpica<RespuestaCalendario>(`/${año}.json`);
  const carreras = datos?.MRData.RaceTable.Races ?? [];

  if (carreras.length === 0) {
    console.log(`   ${año}: sin calendario publicado`);
    return 0;
  }

  for (const carrera of carreras) await upsertRace(carrera);

  const conHorario = (
    await prisma.race.findMany({ where: { year: año }, select: { qualiDate: true } })
  ).filter((carrera) => tieneHora(carrera.qualiDate)).length;

  console.log(`   ${año}: ${carreras.length} carreras · ${conHorario} con horario`);
  return conHorario;
}

async function main() {
  const argumentos = process.argv.slice(2);
  const pedidos = argumentos.filter((a) => /^\d{4}$/.test(a)).map(Number);
  const años = pedidos.length > 0 ? pedidos : await temporadasSinHorario();

  if (años.length === 0) {
    console.log('Todas las temporadas tienen ya su horario.');
    return;
  }

  console.log(`🕐 Horarios · ${años.length} temporadas: ${años.join(' ')}\n`);

  // `--listar` enseña qué se tocaría y se va sin escribir: la única base
  // configurada es la de producción, así que conviene poder mirar antes.
  if (argumentos.includes('--listar')) return;

  let total = 0;
  for (const año of años) total += await sembrarCalendario(año);

  console.log(`\n✅ ${total} carreras con horario en las temporadas tocadas.\n`);
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
