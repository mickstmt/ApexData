/**
 * Rasterises public/icon.svg into the PNGs the manifest and iOS need, and
 * generates the Apple startup images.
 *
 * iOS only uses a startup image when its media query matches the device
 * exactly, so there is one entry per screen geometry rather than a generic
 * fallback. Keep this list in sync with `appleWebApp.startupImage` in
 * src/app/layout.tsx.
 *
 * Usage: npm run pwa:icons
 */

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { fondoDeApertura } from '../../src/lib/splash-art';

const BACKGROUND = '#0B0B0F';

/** El fondo del tema claro, `--background`: hsl(240 5% 97%). */
const BACKGROUND_CLARO = '#F7F7F8';

/** El acento en cada tema, `--primary`: hsl(72 100% 50%) y hsl(72 100% 20%). */
const ACENTO_OSCURO = '#CCFF00';
const ACENTO_CLARO = '#526600';
const publicDir = join(process.cwd(), 'public');
const iconsDir = join(publicDir, 'icons');
const splashDir = join(publicDir, 'splash');

interface IconSpec {
  name: string;
  size: number;
  /** Inset the artwork so Android's maskable crop cannot clip it. */
  padding?: number;
  /** iOS composites its own rounded mask and rejects transparency. */
  flatten?: boolean;
}

const ICONS: IconSpec[] = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180, flatten: true },
  { name: 'maskable-512.png', size: 512, padding: 90 },
];

/** Device geometries: [width, height, scale, label]. */
const SPLASH_SCREENS: Array<[number, number, number, string]> = [
  [320, 568, 2, 'iphone-se-1'],
  [375, 667, 2, 'iphone-8'],
  [414, 736, 3, 'iphone-8-plus'],
  [375, 812, 3, 'iphone-x'],
  [414, 896, 2, 'iphone-xr'],
  [414, 896, 3, 'iphone-xs-max'],
  [390, 844, 3, 'iphone-12'],
  [428, 926, 3, 'iphone-12-pro-max'],
  [375, 812, 3, 'iphone-13-mini'],
  [393, 852, 3, 'iphone-14-pro'],
  [430, 932, 3, 'iphone-14-pro-max'],
  [402, 874, 3, 'iphone-16-pro'],
  [440, 956, 3, 'iphone-16-pro-max'],
];

async function generateIcons(svg: Buffer) {
  await mkdir(iconsDir, { recursive: true });

  for (const { name, size, padding, flatten } of ICONS) {
    const destination = join(iconsDir, name);

    if (padding) {
      const inner = await sharp(svg).resize(size - padding * 2, size - padding * 2).png().toBuffer();
      await sharp({
        create: { width: size, height: size, channels: 4, background: BACKGROUND },
      })
        .composite([{ input: inner, gravity: 'centre' }])
        .png()
        .toFile(destination);
    } else {
      let pipeline = sharp(svg).resize(size, size);
      if (flatten) pipeline = pipeline.flatten({ background: BACKGROUND });
      await pipeline.png().toFile(destination);
    }

    console.log(`   ✓ icons/${name} (${size}×${size})`);
  }
}

/**
 * Las imágenes de arranque de iOS: la composición, **sin la marca**.
 *
 * Antes llevaban el logo centrado, y eso producía un parpadeo al abrir la app:
 * iOS enseñaba la marca ya dibujada, luego había un hueco mientras llegaba el
 * HTML, y después la pantalla de apertura la borraba y volvía a dibujarla desde
 * cero. El logo aparecía dos veces y el ojo lo leía como un salto.
 *
 * Con solo la composición —las dos curvas del ápice sobre el fondo—, la
 * secuencia es continua: lo mismo de principio a fin, y la marca se dibuja una
 * sola vez, ya dentro de la app. La composición vive en `src/lib/splash-art.ts`
 * y de ahí sale también el fondo que pinta la app: si se calcularan por
 * separado, la diferencia se vería como un salto.
 *
 * Se generan los dos temas porque solo había juego oscuro: quien usa la app en
 * claro pasaba de una pantalla negra a una app blanca.
 */
async function generateSplashScreens() {
  await mkdir(splashDir, { recursive: true });

  for (const [width, height, scale, label] of SPLASH_SCREENS) {
    const pixelWidth = width * scale;
    const pixelHeight = height * scale;

    const temas = [
      ['', BACKGROUND, ACENTO_OSCURO],
      ['-claro', BACKGROUND_CLARO, ACENTO_CLARO],
    ] as const;

    for (const [sufijo, fondo, acento] of temas) {
      const svg = Buffer.from(fondoDeApertura(pixelWidth, pixelHeight, fondo, acento));

      // Con paleta: son dos colores planos, y sin esto pesaban 67 KB cada una
      // por guardar millones de colores para representar dos.
      await sharp(svg).png({ palette: true, compressionLevel: 9 }).toFile(
        join(splashDir, `${label}${sufijo}.png`)
      );
    }

    console.log(`   ✓ splash/${label}.png y ${label}-claro.png (${pixelWidth}×${pixelHeight})`);
  }
}

/**
 * Emits the media-query list so layout.tsx never drifts from the files.
 *
 * Tres entradas por dispositivo y en este orden a propósito:
 *
 * 1. Una **sin condición de tema**, que es la red de seguridad: si un iOS viejo
 *    no entiende `prefers-color-scheme`, esta es la única que le encaja y algo
 *    enseña. Sin ella, no encontrar ninguna significa pantalla en blanco.
 * 2. y 3. Las dos específicas por tema. Van después porque, cuando dos
 *    coinciden, la última manda.
 *
 * Y todas llevan `orientation: portrait`: Apple lo pide, y sin él hay
 * dispositivos que no reconocen la suya.
 */
async function writeStartupImageManifest() {
  const entries = SPLASH_SCREENS.flatMap(([width, height, scale, label]) => {
    const geometria =
      `(device-width: ${width}px) and (device-height: ${height}px) ` +
      `and (-webkit-device-pixel-ratio: ${scale}) and (orientation: portrait)`;

    return [
      { url: `/splash/${label}.png`, media: geometria },
      {
        url: `/splash/${label}.png`,
        media: `${geometria} and (prefers-color-scheme: dark)`,
      },
      {
        url: `/splash/${label}-claro.png`,
        media: `${geometria} and (prefers-color-scheme: light)`,
      },
    ];
  });

  await writeFile(
    join(process.cwd(), 'src', 'lib', 'apple-splash.ts'),
    `/**\n * Generated by scripts/pwa/generate-icons.ts — do not edit by hand.\n */\n\n` +
      `export const APPLE_STARTUP_IMAGES = ${JSON.stringify(entries, null, 2)} as const;\n`
  );

  console.log(`   ✓ src/lib/apple-splash.ts (${entries.length} entradas)`);
}

async function main() {
  console.log('🎨 Generando iconos y splash screens\n');

  const svg = await readFile(join(publicDir, 'icon.svg'));

  await generateIcons(svg);
  await generateSplashScreens();
  await writeStartupImageManifest();

  console.log('\n✅ Listo.\n');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
