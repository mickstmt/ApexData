/**
 * Points the database at whatever images exist under public/images.
 *
 * Runs after the download scripts (or after dropping files in by hand) and is
 * safe to re-run: rows whose asset is missing are cleared rather than left
 * pointing at a 404.
 *
 * Usage: npx tsx scripts/images/seed-paths.ts
 */

import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { PUBLIC_IMAGES } from './lib';

const prisma = new PrismaClient();

// prisma.team collides with Object.prototype.constructor; see src/lib/prisma.ts.

/** Maps "<id>.<ext>" filenames to `{ id: "/images/<folder>/<file>" }`. */
async function indexFolder(folder: string): Promise<Map<string, string>> {
  const files = await readdir(join(PUBLIC_IMAGES, folder)).catch(() => [] as string[]);
  const index = new Map<string, string>();

  for (const file of files) {
    const id = file.replace(/\.\w+$/, '');
    index.set(id, `/images/${folder}/${file}`);
  }

  return index;
}

async function main() {
  console.log('🔗 Vinculando imágenes a la base de datos\n');

  const [driverImages, constructorImages, circuitImages] = await Promise.all([
    indexFolder('drivers'),
    indexFolder('constructors'),
    indexFolder('circuits'),
  ]);

  const [drivers, constructors, circuits] = await Promise.all([
    prisma.driver.findMany({ select: { id: true, driverId: true, imageUrl: true } }),
    prisma.team.findMany(),
    prisma.circuit.findMany({ select: { id: true, circuitId: true, imageUrl: true } }),
  ]);

  let linked = 0;
  let cleared = 0;

  for (const driver of drivers) {
    const path = driverImages.get(driver.driverId) ?? null;
    if (path === driver.imageUrl) continue;

    await prisma.driver.update({ where: { id: driver.id }, data: { imageUrl: path } });
    if (path) linked++;
    else cleared++;
  }
  console.log(`   Pilotos:    ${driverImages.size} imágenes disponibles`);

  for (const constructor of constructors) {
    const path = constructorImages.get(constructor.constructorId) ?? null;
    if (path === constructor.logoUrl) continue;

    await prisma.team.update({ where: { id: constructor.id }, data: { logoUrl: path } });
    if (path) linked++;
    else cleared++;
  }
  console.log(`   Equipos:    ${constructorImages.size} logos disponibles`);

  for (const circuit of circuits) {
    const path = circuitImages.get(circuit.circuitId) ?? null;
    if (path === circuit.imageUrl) continue;

    await prisma.circuit.update({ where: { id: circuit.id }, data: { imageUrl: path } });
    if (path) linked++;
    else cleared++;
  }
  console.log(`   Circuitos:  ${circuitImages.size} trazados disponibles`);

  console.log(`\n   ✅ ${linked} rutas actualizadas, ${cleared} limpiadas por falta de archivo`);
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
