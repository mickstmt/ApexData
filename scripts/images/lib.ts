/**
 * Shared helpers for the image pipeline.
 *
 * Every asset is downloaded once and committed under public/images/, because
 * hotlinking is what broke the December 2025 attempt: media.formula1.com and
 * upload.wikimedia.org both reject or throttle unattended requests, and
 * Wikimedia specifically answers 403 to any client without a descriptive
 * User-Agent.
 */

import 'dotenv/config';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

export const USER_AGENT =
  'ApexData/1.0 (personal F1 data app; https://github.com/mickstmt/ApexData)';

/** Politeness gap between downloads; bursts earn 429s. */
const DOWNLOAD_DELAY_MS = 400;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const PUBLIC_IMAGES = join(process.cwd(), 'public', 'images');

export async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export interface DownloadResult {
  status: 'downloaded' | 'skipped' | 'failed';
  reason?: string;
}

/**
 * Downloads `url` into `destination` unless the file is already there.
 * Never throws: a failed asset is reported so the run can continue.
 */
export async function downloadImage(
  url: string,
  destination: string,
  { force = false }: { force?: boolean } = {}
): Promise<DownloadResult> {
  if (!force && (await exists(destination))) {
    return { status: 'skipped' };
  }

  try {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

    if (!response.ok) {
      return { status: 'failed', reason: `HTTP ${response.status}` };
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // GitHub and Wikimedia answer 200 with an HTML page when an asset is
    // missing, so validate the payload instead of trusting the status code.
    // Flag SVGs are legitimately a few hundred bytes, hence no size floor.
    const head = buffer.subarray(0, 200).toString('utf8').trimStart().toLowerCase();
    const isHtml = head.startsWith('<!doctype html') || head.startsWith('<html');

    if (isHtml || buffer.byteLength < 100) {
      return {
        status: 'failed',
        reason: isHtml ? 'la respuesta era HTML' : `respuesta de ${buffer.byteLength} bytes`,
      };
    }

    await writeFile(destination, buffer);
    await sleep(DOWNLOAD_DELAY_MS);

    return { status: 'downloaded' };
  } catch (error) {
    return { status: 'failed', reason: error instanceof Error ? error.message : String(error) };
  }
}

/** Prints a one-line summary and returns the tallies. */
export function report(label: string, results: DownloadResult[]) {
  const downloaded = results.filter((r) => r.status === 'downloaded').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'failed');

  console.log(
    `\n   ${label}: ${downloaded} descargadas, ${skipped} ya existían, ${failed.length} fallidas`
  );

  return { downloaded, skipped, failed: failed.length };
}

/** Normalises names for fuzzy matching between APIs (accents, case, spacing). */
export function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}
