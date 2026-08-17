/**
 * Downloads team logos from Wikimedia Commons.
 *
 * The December 2025 attempt failed because Wikimedia answers 403 to clients
 * without a descriptive User-Agent, and because file URLs were guessed instead
 * of resolved. Both are fixed here: the Commons API resolves each title to its
 * real upload URL, and every request identifies itself.
 *
 * Teams whose full logo is non-free are left for manual placement; the seeder
 * simply picks up whatever SVG/PNG sits in public/images/constructors.
 *
 * Usage: npx tsx scripts/images/logos.ts [--force]
 */

import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import {
  PUBLIC_IMAGES,
  USER_AGENT,
  downloadImage,
  ensureDir,
  report,
  sleep,
  type DownloadResult,
} from './lib';

const prisma = new PrismaClient();

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

/**
 * Ergast constructorId → Commons file title. Only freely licensed marks are
 * listed: wordmarks and simple geometric logos that fall below the threshold
 * of originality. Everything else is flagged as manual.
 */
const COMMONS_FILES: Record<string, string> = {
  mclaren: 'File:McLaren Speedmark.svg',
  mercedes: 'File:Mercedes-Benz in Formula One logo.svg',
  audi: 'File:Audi-Logo 2016.svg',
  alpine: 'File:Alpine F1 Team Logo.svg',
  williams: 'File:Williams Racing Logo 2024.webp',
  haas: 'File:Haas F1 Team Logo.svg',
  sauber: 'File:Sauber F1 Team logo.svg',
  alfa: 'File:Alfa Romeo F1 Team Stake Logo.svg',
  renault: 'File:Renault F1 Team logo.svg',
  racing_point: 'File:Racing Point F1 Team logo.svg',
};

/** Resolves a Commons file title to its direct upload.wikimedia.org URL. */
async function resolveCommonsUrl(title: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url',
    format: 'json',
    origin: '*',
  });

  const response = await fetch(`${COMMONS_API}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    query?: { pages?: Record<string, { imageinfo?: Array<{ url: string }> }> };
  };

  const pages = Object.values(data.query?.pages ?? {});
  await sleep(300);

  return pages[0]?.imageinfo?.[0]?.url ?? null;
}

async function main() {
  const force = process.argv.includes('--force');
  const destinationDir = join(PUBLIC_IMAGES, 'constructors');
  await ensureDir(destinationDir);

  console.log('🏎️  Logos de equipos\n');

  const constructors = (await prisma.team.findMany({
    orderBy: { constructorId: 'asc' },
  })) as Array<{ constructorId: string; name: string }>;

  const results: DownloadResult[] = [];
  const manual: string[] = [];

  for (const constructor of constructors) {
    const title = COMMONS_FILES[constructor.constructorId];

    if (!title) {
      manual.push(`${constructor.constructorId} (${constructor.name})`);
      continue;
    }

    const url = await resolveCommonsUrl(title);

    if (!url) {
      console.log(`   ❌ ${constructor.constructorId}: Commons no resolvió "${title}"`);
      results.push({ status: 'failed', reason: 'sin URL' });
      continue;
    }

    // Commons appends tracking query params, so read the extension off the
    // pathname rather than the raw URL.
    const extension = new URL(url).pathname.split('.').pop()?.toLowerCase() ?? 'svg';
    const result = await downloadImage(
      url,
      join(destinationDir, `${constructor.constructorId}.${extension}`),
      { force }
    );

    if (result.status === 'downloaded') {
      console.log(`   ✅ ${constructor.constructorId}`);
    } else if (result.status === 'failed') {
      console.log(`   ❌ ${constructor.constructorId}: ${result.reason}`);
    }

    results.push(result);
  }

  report('Logos', results);

  // Anything already dropped in by hand counts as covered.
  const present = new Set(
    (await readdir(destinationDir).catch(() => [])).map((file) => file.replace(/\.\w+$/, ''))
  );
  const stillMissing = manual.filter((entry) => !present.has(entry.split(' ')[0]));

  if (stillMissing.length > 0) {
    console.log(`\n   Pendientes de colocar a mano (${stillMissing.length}):`);
    for (const name of stillMissing) console.log(`     · ${name}`);
    console.log(`\n   Guarda cada archivo como public/images/constructors/<constructorId>.svg`);
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
