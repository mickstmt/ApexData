/**
 * Team colour system.
 *
 * Each team carries two values: `color` is the identity, used as a solid block
 * (the vertical bar on a timing row, a chip background) where any hue works;
 * `onDark` is the version safe as ink or as a chart line on the carbon ground.
 * They differ where the identity colour cannot be read on a dark background —
 * Mercedes' black, the white liveries, Williams' navy — which is exactly why
 * team colour is never applied directly to text.
 */

export interface TeamColor {
  color: string;
  onDark: string;
}

const TEAM_COLORS: Record<string, TeamColor> = {
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
const FALLBACK: TeamColor = { color: '#8A8A94', onDark: '#A0A0AB' };

export function teamColor(constructorId: string | null | undefined): TeamColor {
  if (!constructorId) return FALLBACK;
  return TEAM_COLORS[constructorId] ?? FALLBACK;
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
