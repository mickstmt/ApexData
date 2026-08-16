/**
 * Downloads circular country flags (HatScripts/circle-flags, MIT).
 *
 * Jolpica reports nationalities as demonyms ("Dutch", "Thai"), and circuits as
 * country names ("Netherlands"), so both are mapped to ISO 3166-1 alpha-2 here.
 *
 * Usage: npx tsx scripts/images/flags.ts [--force]
 */

import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PUBLIC_IMAGES, downloadImage, ensureDir, report, type DownloadResult } from './lib';
import { NATIONALITY_TO_ISO, COUNTRY_TO_ISO } from '../../src/lib/countries';

const prisma = new PrismaClient();

const FLAGS_BASE = 'https://raw.githubusercontent.com/HatScripts/circle-flags/gh-pages/flags';

async function main() {
  const force = process.argv.includes('--force');
  const destinationDir = join(PUBLIC_IMAGES, 'flags');
  await ensureDir(destinationDir);

  console.log('🚩 Banderas\n');

  const [drivers, circuits] = await Promise.all([
    prisma.driver.findMany({ select: { nationality: true } }),
    prisma.circuit.findMany({ select: { country: true } }),
  ]);

  const codes = new Set<string>();
  const unmapped = new Set<string>();

  for (const { nationality } of drivers) {
    const iso = NATIONALITY_TO_ISO[nationality];
    iso ? codes.add(iso) : unmapped.add(nationality);
  }

  for (const { country } of circuits) {
    const iso = COUNTRY_TO_ISO[country];
    iso ? codes.add(iso) : unmapped.add(country);
  }

  const results: DownloadResult[] = [];

  for (const code of [...codes].sort()) {
    const result = await downloadImage(
      `${FLAGS_BASE}/${code}.svg`,
      join(destinationDir, `${code}.svg`),
      { force }
    );

    if (result.status === 'failed') console.log(`   ❌ ${code}: ${result.reason}`);
    results.push(result);
  }

  report('Banderas', results);

  if (unmapped.size > 0) {
    console.log(`\n   Sin mapear a ISO (${unmapped.size}): ${[...unmapped].join(', ')}`);
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
