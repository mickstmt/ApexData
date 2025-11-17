/**
 * Application Constants
 */

export const APP_NAME = 'ApexData';
export const APP_DESCRIPTION = 'Modern and elegant Formula 1 data platform';

export const COLORS = {
  primary: '#CCFF00', // Verde limón
  primaryDark: '#B8F500',
  primaryLight: '#E0FF66',
  background: '#FFFFFF',
  backgroundDark: '#0A0A0A',
  accent: '#000000',
  accentGray: '#1A1A1A',
} as const;

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
} as const;

export const CACHE_TTL = {
  staticData: Infinity, // Datos históricos inmutables
  currentSeason: 3600, // 1 hora
  lastRace: 300, // 5 minutos
  telemetry: 60, // 1 minuto
} as const;
