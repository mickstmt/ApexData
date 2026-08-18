import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEAM_IDS, compoundColor, teamColor } from '@/lib/team-colors';
import { COUNTRY_TO_ISO, NATIONALITY_TO_ISO } from '@/lib/countries';

/**
 * Contrast against the lightest ground a chart actually sits on. Not white:
 * `--background` in the light theme is 240 5% 97%, and being the darker of the
 * two surfaces it is the one that has to clear the threshold.
 */
const LIGHT_GROUND_LUMINANCE = 0.9303;

function contrastOnLightGround(hex: string): number {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return (LIGHT_GROUND_LUMINANCE + 0.05) / (luminance + 0.05);
}

describe('teamColor', () => {
  it('returns the identity and on-dark pair for a known team', () => {
    expect(teamColor('mclaren').color).toBe('#FF8000');
    expect(teamColor('ferrari').onDark).toBeTruthy();
  });

  it('gives every team a light variant that a chart line can be seen at', () => {
    // The bug this guards: charts drew `onDark` on the light ground, where
    // Mercedes read at 1.4:1 and Renault at 1.15:1 — invisible.
    for (const id of TEAM_IDS) {
      expect(contrastOnLightGround(teamColor(id).onLight)).toBeGreaterThanOrEqual(3);
    }

    expect(contrastOnLightGround(teamColor('unknown-team').onLight)).toBeGreaterThanOrEqual(3);
  });

  it('leaves an identity colour alone when it is already legible there', () => {
    expect(teamColor('ferrari').onLight).toBe('#E80020');
    expect(teamColor('minardi').onLight).toBe('#000000');
  });

  it('falls back to a neutral for unknown or missing teams', () => {
    const fallback = teamColor(null).color;

    expect(teamColor('a-team-that-never-raced').color).toBe(fallback);
    expect(teamColor(undefined).color).toBe(fallback);
  });

  it('gives every 2026 team a colour of its own', () => {
    const grid = [
      'mclaren',
      'ferrari',
      'red_bull',
      'mercedes',
      'aston_martin',
      'williams',
      'audi',
      'alpine',
      'haas',
      'rb',
      'cadillac',
    ];

    const fallback = teamColor(null).color;
    const colors = grid.map((id) => teamColor(id).color);

    expect(colors.filter((color) => color === fallback)).toHaveLength(0);
    expect(new Set(colors).size).toBe(grid.length);
  });

  it('lightens the colours that would be unreadable on the carbon ground', () => {
    // Mercedes' identity is black and Williams' is navy; as chart ink on a
    // dark surface they need a different value, which is why onDark exists.
    expect(teamColor('mercedes').onDark).not.toBe('#000000');
    expect(teamColor('aston_martin').onDark).not.toBe(teamColor('aston_martin').color);
  });
});

describe('compoundColor', () => {
  it('uses the values FastF1 plots with', () => {
    expect(compoundColor('SOFT')).toBe('#DA291C');
    expect(compoundColor('MEDIUM')).toBe('#FFD12E');
    expect(compoundColor('HARD')).toBe('#F0F0EC');
  });

  it('accepts the casing FastF1 actually returns', () => {
    expect(compoundColor('soft')).toBe(compoundColor('SOFT'));
  });

  it('falls back for an unknown or missing compound', () => {
    expect(compoundColor(null)).toBe(compoundColor('UNKNOWN'));
    expect(compoundColor('SUPERSOFT')).toBe(compoundColor('UNKNOWN'));
  });
});

describe('country mappings', () => {
  const flagsDir = join(process.cwd(), 'public', 'images', 'flags');

  it('maps every nationality to a two-letter ISO code', () => {
    for (const [nationality, iso] of Object.entries(NATIONALITY_TO_ISO)) {
      expect(iso, nationality).toMatch(/^[a-z]{2}$/);
    }
  });

  it('maps every country to a two-letter ISO code', () => {
    for (const [country, iso] of Object.entries(COUNTRY_TO_ISO)) {
      expect(iso, country).toMatch(/^[a-z]{2}$/);
    }
  });

  it('agrees with itself where both list the same place', () => {
    expect(NATIONALITY_TO_ISO.British).toBe(COUNTRY_TO_ISO.UK);
    expect(NATIONALITY_TO_ISO.Italian).toBe(COUNTRY_TO_ISO.Italy);
    expect(NATIONALITY_TO_ISO.Dutch).toBe(COUNTRY_TO_ISO.Netherlands);
  });

  it('has a downloaded flag for the 2026 grid nationalities', () => {
    // A missing file renders nothing rather than breaking, but it is still a
    // gap worth catching here instead of on the page.
    const grid = ['British', 'Dutch', 'Italian', 'Monegasque', 'Spanish', 'Australian', 'Thai'];

    for (const nationality of grid) {
      const iso = NATIONALITY_TO_ISO[nationality];
      expect(iso, `${nationality} has no ISO code`).toBeTruthy();
      expect(existsSync(join(flagsDir, `${iso}.svg`)), `missing flag ${iso}.svg`).toBe(true);
    }
  });
});
