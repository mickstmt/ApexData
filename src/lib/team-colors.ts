import type { CSSProperties } from 'react';

/**
 * Team colour system.
 *
 * Each team carries three values: `color` is the identity, used as a solid
 * block (the vertical bar on a timing row, a chip background) where any hue
 * works; `onDark` is the version safe as ink or as a chart line on the carbon
 * ground; `onLight` is the same for the white one. They differ where the
 * identity colour cannot be read on a given background — Mercedes' turquoise
 * vanishes on white at 1.4:1, Renault's yellow at 1.15:1 — which is exactly
 * why team colour is never applied directly to text.
 *
 * `onLight` is derived rather than hand-written: darkening the identity colour
 * until it clears 3:1 on the light ground keeps the hue recognisable, and means
 * a team added later cannot arrive without a legible light variant.
 */

export interface TeamColor {
  color: string;
  onDark: string;
  onLight: string;
}

/** Contrast a line or a swatch has to clear against its ground (WCAG 1.4.11). */
const GRAPHIC_CONTRAST = 3;

/**
 * The lightest ground is not white: charts sit on `--background` (240 5% 97%)
 * as often as on a white card, and that is the darker of the two, so it is the
 * one worth clearing. Measuring against white passed McLaren at 3.08:1 that
 * read 2.88:1 on the real page.
 */
const LIGHT_GROUND_LUMINANCE = 0.9303;

function toRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastOnLightGround(hex: string): number {
  return (LIGHT_GROUND_LUMINANCE + 0.05) / (relativeLuminance(hex) + 0.05);
}

/** Scales every channel towards black, which holds the hue. */
function scale(hex: string, factor: number): string {
  const channels = toRgb(hex).map((channel) =>
    Math.round(Math.min(255, Math.max(0, channel * 255 * factor)))
  );
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/**
 * Identity colour darkened just enough to be visible on the white canvas.
 *
 * `minimo` exists because the same derivation serves two jobs with different
 * thresholds: a line or a swatch needs 3:1 (WCAG 1.4.11), but the accent of a
 * favourite team also becomes link and button text, and text needs 4.5:1.
 */
export function readableOnLight(hex: string, minimo: number = GRAPHIC_CONTRAST): string {
  let candidate = hex.toUpperCase();

  for (let step = 0; step < 40 && contrastOnLightGround(candidate) < minimo; step++) {
    candidate = scale(hex, 1 - (step + 1) * 0.05);
  }

  return candidate;
}

/** Contrast between two colours, for deciding ink over a filled block. */
export function contrastBetween(a: string, b: string): number {
  const [claro, oscuro] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

const IDENTITIES: Record<string, Omit<TeamColor, 'onLight'>> = {
  mclaren: { color: '#FF8000', onDark: '#FF9A33' },
  ferrari: { color: '#E80020', onDark: '#FF4155' },
  red_bull: { color: '#3671C6', onDark: '#5B93E8' },
  mercedes: { color: '#27F4D2', onDark: '#27F4D2' },
  aston_martin: { color: '#00665E', onDark: '#00B3A4' },
  alpine: { color: '#FF87BC', onDark: '#FF9FC9' },
  williams: { color: '#64C4FF', onDark: '#64C4FF' },
  rb: { color: '#6692FF', onDark: '#8AACFF' },
  haas: { color: '#E6002B', onDark: '#FF5470' },
  audi: { color: '#C8CED4', onDark: '#D9DEE3' },
  cadillac: { color: '#B8860B', onDark: '#E0A82E' },

  // Earlier identities of teams still present in historical seasons.
  sauber: { color: '#52E252', onDark: '#6BEE6B' },
  alfa: { color: '#C92D4B', onDark: '#F0526F' },
  alphatauri: { color: '#5E8FAA', onDark: '#7FAFC9' },
  toro_rosso: { color: '#469BFF', onDark: '#6BAEFF' },
  racing_point: { color: '#F596C8', onDark: '#F8AED5' },
  force_india: { color: '#F596C8', onDark: '#F8AED5' },
  renault: { color: '#FFF500', onDark: '#FFF500' },
  lotus_f1: { color: '#FFB800', onDark: '#FFC633' },
  manor: { color: '#323232', onDark: '#9A9A9A' },
  marussia: { color: '#6E0000', onDark: '#D14B4B' },
  caterham: { color: '#0B361F', onDark: '#3F9E6B' },
  hrt: { color: '#B2945B', onDark: '#CBAE78' },
  virgin: { color: '#CE0000', onDark: '#FF4D4D' },
  brawn: { color: '#B8FD6E', onDark: '#B8FD6E' },
  toyota: { color: '#CC0000', onDark: '#FF4D4D' },
  bmw_sauber: { color: '#006EFF', onDark: '#4B9BFF' },
  honda: { color: '#CC1E4A', onDark: '#F04B73' },
  super_aguri: { color: '#E00000', onDark: '#FF4D4D' },
  spyker: { color: '#FF8700', onDark: '#FFA033' },
  midland: { color: '#CE0000', onDark: '#FF4D4D' },
  jordan: { color: '#EFCE00', onDark: '#EFCE00' },
  bar: { color: '#CE0000', onDark: '#FF4D4D' },
  jaguar: { color: '#0A5C2C', onDark: '#3FA86A' },
  minardi: { color: '#000000', onDark: '#9A9A9A' },
  arrows: { color: '#FA9E01', onDark: '#FFB733' },
  prost: { color: '#0000FF', onDark: '#6B6BFF' },
  benetton: { color: '#008000', onDark: '#3FBF3F' },
  stewart: { color: '#FFFFFF', onDark: '#E5E5E5' },
  tyrrell: { color: '#0000FF', onDark: '#6B6BFF' },
  ligier: { color: '#0000FF', onDark: '#6B6BFF' },
  lotus_racing: { color: '#FFB800', onDark: '#FFC633' },
};

/** Neutral used for teams with no palette of their own. */
const FALLBACK_IDENTITY: Omit<TeamColor, 'onLight'> = { color: '#8A8A94', onDark: '#A0A0AB' };

const withLightVariant = (identity: Omit<TeamColor, 'onLight'>): TeamColor => ({
  ...identity,
  onLight: readableOnLight(identity.color),
});

const TEAM_COLORS: Record<string, TeamColor> = Object.fromEntries(
  Object.entries(IDENTITIES).map(([id, identity]) => [id, withLightVariant(identity)])
);

const FALLBACK: TeamColor = withLightVariant(FALLBACK_IDENTITY);

/** Every team with a palette of its own, current and historical. */
export const TEAM_IDS = Object.keys(TEAM_COLORS);

export function teamColor(constructorId: string | null | undefined): TeamColor {
  if (!constructorId) return FALLBACK;
  return TEAM_COLORS[constructorId] ?? FALLBACK;
}

/**
 * Both variants as custom properties, to pair with the `.team-ink` class:
 * `currentColor` then resolves to whichever the theme calls for.
 */
export function teamInk(constructorId: string | null | undefined): CSSProperties {
  const { onDark, onLight } = teamColor(constructorId);
  return { '--team-on-dark': onDark, '--team-on-light': onLight } as CSSProperties;
}

/**
 * Tyre compounds, using the values FastF1 plots with so charts here match the
 * rest of the ecosystem.
 */
export const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#DA291C',
  MEDIUM: '#FFD12E',
  HARD: '#F0F0EC',
  INTERMEDIATE: '#43B02A',
  WET: '#0067AD',
  UNKNOWN: '#8A8A94',
};

export function compoundColor(compound: string | null | undefined): string {
  if (!compound) return COMPOUND_COLORS.UNKNOWN;
  return COMPOUND_COLORS[compound.toUpperCase()] ?? COMPOUND_COLORS.UNKNOWN;
}

/**
 * De cómo llama FastF1 a un equipo al identificador que usa esta app.
 *
 * Hace falta porque la lista de pilotos de la página de análisis sale de la
 * **última carrera**, así que al abrir una sesión de 2024 los que ya no compiten
 * —Ricciardo, Sargeant, Zhou, Magnussen, Hülkenberg, Bottas, Pérez— se quedaban
 * sin equipo y sus cajas y sus puntos salían grises. El dato correcto viaja en
 * las propias vueltas: cada una trae el equipo de ese piloto **en esa sesión**,
 * que además es la respuesta buena para quien cambió de equipo a mitad de año.
 *
 * Se busca por trozo de nombre y no por igualdad porque el patrocinador entra y
 * sale del nombre oficial cada temporada: «Sauber» ha sido «Alfa Romeo Racing»,
 * «Alfa Romeo» y «Stake F1 Team Kick Sauber» sin dejar de ser el mismo equipo.
 * El orden importa: lo más específico primero.
 */
const NOMBRES: [string, string][] = [
  ['red bull racing', 'red_bull'],
  ['racing bulls', 'rb'],
  ['visa cash app', 'rb'],
  ['alphatauri', 'alphatauri'],
  ['toro rosso', 'toro_rosso'],
  ['kick sauber', 'sauber'],
  ['alfa romeo', 'alfa'],
  ['sauber', 'sauber'],
  ['aston martin', 'aston_martin'],
  ['racing point', 'racing_point'],
  ['force india', 'force_india'],
  ['haas', 'haas'],
  ['ferrari', 'ferrari'],
  ['mercedes', 'mercedes'],
  ['mclaren', 'mclaren'],
  ['alpine', 'alpine'],
  ['renault', 'renault'],
  ['williams', 'williams'],
  ['audi', 'audi'],
  ['cadillac', 'cadillac'],
  ['lotus', 'lotus_f1'],
  ['manor', 'manor'],
  ['marussia', 'marussia'],
  ['caterham', 'caterham'],
  ['virgin', 'virgin'],
  ['hrt', 'hrt'],
];

/**
 * Nombres tan cortos que buscarlos como trozo daría falsos positivos: «rb»
 * aparece dentro de cualquier palabra con esas dos letras seguidas.
 */
const EXACTOS: Record<string, string> = { rb: 'rb' };

export function teamIdFromName(name: string | null | undefined): string | null {
  if (!name) return null;

  const limpio = name.toLowerCase().trim();

  if (EXACTOS[limpio]) return EXACTOS[limpio];

  for (const [trozo, id] of NOMBRES) {
    if (limpio.includes(trozo)) return id;
  }

  return null;
}
