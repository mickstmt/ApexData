/**
 * Downloads circuit layout outlines as SVG.
 *
 * Primary source is MasterPlay007/F1-Track-Layouts-SVG (CC0), whose filenames
 * already use Ergast circuit ids. Circuits it does not cover fall back to
 * f1db/f1db (CC BY 4.0), which keeps every historical layout under its own
 * naming, hence the mapping table below.
 *
 * Usage: npx tsx scripts/images/circuits.ts [--force]
 */

import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PUBLIC_IMAGES, downloadImage, ensureDir, report, type DownloadResult } from './lib';

const prisma = new PrismaClient();

const CC0_BASE = 'https://raw.githubusercontent.com/MasterPlay007/F1-Track-Layouts-SVG/main';
const F1DB_BASE = 'https://raw.githubusercontent.com/f1db/f1db/main/src/assets/circuits/white';

/** Ergast circuitId → F1DB asset name, for circuits missing from the CC0 repo. */
const F1DB_FALLBACK: Record<string, string> = {
  imola: 'imola-3',
  zandvoort: 'zandvoort-2',
  madring: 'madring-1',
  mugello: 'mugello-1',
  portimao: 'portimao-1',
  ricard: 'paul-ricard-6',
  istanbul: 'istanbul-1',
  sochi: 'sochi-1',
  hockenheimring: 'hockenheim-5',
  nurburgring: 'nurburgring-5',
  jeddah: 'jeddah-1',
  vegas: 'las-vegas-3',
  losail: 'losail-1',
  miami: 'miami-1',
};

async function main() {
  const force = process.argv.includes('--force');
  const destinationDir = join(PUBLIC_IMAGES, 'circuits');
  await ensureDir(destinationDir);

  console.log('🏁 Trazados de circuitos\n');

  const circuits = await prisma.circuit.findMany({ orderBy: { circuitId: 'asc' } });
  const results: DownloadResult[] = [];
  const missing: string[] = [];

  for (const circuit of circuits) {
    const destination = join(destinationDir, `${circuit.circuitId}.svg`);

    // Try the CC0 repo first, then F1DB.
    let result = await downloadImage(`${CC0_BASE}/${circuit.circuitId}.svg`, destination, { force });

    if (result.status === 'failed') {
      const fallbackName = F1DB_FALLBACK[circuit.circuitId] ?? `${circuit.circuitId}-1`;
      result = await downloadImage(`${F1DB_BASE}/${fallbackName}.svg`, destination, { force });
    }

    if (result.status === 'downloaded') {
      console.log(`   ✅ ${circuit.circuitId}`);
    } else if (result.status === 'failed') {
      missing.push(`${circuit.circuitId} (${circuit.name})`);
    }

    results.push(result);
  }

  report('Circuitos', results);

  if (missing.length > 0) {
    console.log(`\n   Sin trazado disponible (${missing.length}):`);
    for (const name of missing) console.log(`     · ${name}`);
    console.log('\n   Se pueden generar con FastF1 a partir de datos de posición.');
  }
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
