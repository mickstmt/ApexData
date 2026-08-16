/**
 * Downloads official driver headshots.
 *
 * Jolpica owns the identity (driverId) but serves no images; OpenF1 exposes
 * `headshot_url` pointing at the official F1 media service. This walks every
 * season OpenF1 covers (2023+), matches its drivers against the ones already
 * in our database, and saves one PNG per driverId.
 *
 * Usage: npx tsx scripts/images/drivers.ts [--force]
 */

import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  PUBLIC_IMAGES,
  downloadImage,
  ensureDir,
  normalizeName,
  report,
  sleep,
  type DownloadResult,
} from './lib';

const prisma = new PrismaClient();

const OPENF1_BASE = 'https://api.openf1.org/v1';
const SEASONS = [2023, 2024, 2025, 2026];

interface OpenF1Driver {
  full_name?: string;
  name_acronym?: string;
  driver_number?: number;
  headshot_url?: string | null;
}

/**
 * Ergast-style ids do not always match the driver's surname, and OpenF1 only
 * gives us names, so these are resolved by hand.
 */
const MANUAL_MATCHES: Record<string, string> = {
  max_verstappen: 'max verstappen',
  kevin_magnussen: 'kevin magnussen',
  jolyon_palmer: 'jolyon palmer',
  pietro_fittipaldi: 'pietro fittipaldi',
  antonelli: 'andrea kimi antonelli',
  hulkenberg: 'nico hulkenberg',
  perez: 'sergio perez',
  sainz: 'carlos sainz',
  bearman: 'oliver bearman',
  colapinto: 'franco colapinto',
  doohan: 'jack doohan',
  lawson: 'liam lawson',
  hadjar: 'isack hadjar',
  bortoleto: 'gabriel bortoleto',
  lindblad: 'arvid lindblad',
  zhou: 'zhou guanyu',
  de_vries: 'nyck de vries',
};

/** /drivers has no year filter, so entries are collected per race session. */
async function fetchOpenF1Drivers(): Promise<Map<string, OpenF1Driver>> {
  const byName = new Map<string, OpenF1Driver>();

  for (const year of SEASONS) {
    const sessionsResponse = await fetch(`${OPENF1_BASE}/sessions?year=${year}&session_name=Race`);

    if (!sessionsResponse.ok) {
      console.log(`   ⚠️  OpenF1 sesiones ${year}: HTTP ${sessionsResponse.status}`);
      continue;
    }

    const sessions = (await sessionsResponse.json()) as Array<{ session_key: number }>;
    let found = 0;

    // A few sessions per season is enough: rosters barely move, and mid-season
    // replacements show up in the later ones.
    const sampled = sessions.filter((_, index) => index % 4 === 0).slice(0, 6);

    for (const session of sampled) {
      const response = await fetch(`${OPENF1_BASE}/drivers?session_key=${session.session_key}`);
      if (!response.ok) continue;

      const drivers = (await response.json()) as OpenF1Driver[];

      for (const driver of drivers) {
        if (!driver.full_name || !driver.headshot_url) continue;
        // Later seasons overwrite earlier ones, keeping the freshest portrait.
        byName.set(normalizeName(driver.full_name), driver);
        found++;
      }

      await sleep(300);
    }

    console.log(`   ${year}: ${found} registros en ${sampled.length} sesiones`);
  }

  return byName;
}

async function main() {
  const force = process.argv.includes('--force');
  const destinationDir = join(PUBLIC_IMAGES, 'drivers');
  await ensureDir(destinationDir);

  console.log('👤 Headshots de pilotos\n');
  console.log('   Consultando OpenF1...');
  const openF1Drivers = await fetchOpenF1Drivers();
  console.log(`   ${openF1Drivers.size} pilotos con foto disponible\n`);

  const drivers = await prisma.driver.findMany({ orderBy: { driverId: 'asc' } });
  const results: DownloadResult[] = [];
  const unmatched: string[] = [];

  for (const driver of drivers) {
    const fullName = normalizeName(`${driver.givenName} ${driver.familyName}`);
    const manual = MANUAL_MATCHES[driver.driverId];

    // Surname alone is ambiguous across eras (Verstappen, Schumacher, Hill,
    // Rosberg), so it only counts when exactly one driver matches.
    const surnameMatches = [...openF1Drivers.entries()].filter(([name]) =>
      name.endsWith(` ${normalizeName(driver.familyName)}`)
    );

    const match =
      openF1Drivers.get(fullName) ??
      (manual ? openF1Drivers.get(normalizeName(manual)) : undefined) ??
      (surnameMatches.length === 1 ? surnameMatches[0][1] : undefined);

    if (!match?.headshot_url) {
      unmatched.push(`${driver.driverId} (${driver.givenName} ${driver.familyName})`);
      continue;
    }

    // The default transform is a small thumbnail; 2col is twice the width.
    const url = match.headshot_url.replace('/1col/', '/2col/');
    const destination = join(destinationDir, `${driver.driverId}.png`);
    const result = await downloadImage(url, destination, { force });

    if (result.status === 'downloaded') {
      console.log(`   ✅ ${driver.driverId}`);
    } else if (result.status === 'failed') {
      console.log(`   ❌ ${driver.driverId}: ${result.reason}`);
    }

    results.push(result);
  }

  report('Pilotos', results);

  if (unmatched.length > 0) {
    console.log(`\n   Sin foto en OpenF1 (${unmatched.length}):`);
    for (const name of unmatched) console.log(`     · ${name}`);
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
