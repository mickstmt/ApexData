/**
 * Site Configuration and Metadata
 */

import { APP_NAME, APP_DESCRIPTION } from './constants';

export const siteConfig = {
  name: APP_NAME,
  description: APP_DESCRIPTION,
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ogImage: '/og-image.png',
  links: {
    github: 'https://github.com/mickstmt/ApexData',
  },
  creator: 'ApexData',
} as const;

/**
 * Primary navigation. Keep in sync with the links rendered by
 * src/components/layout/Header.tsx.
 */
export const navItems = [
  {
    title: 'Inicio',
    href: '/',
    description: 'Vista general de la temporada actual',
  },
  {
    title: 'Calendario',
    href: '/calendar',
    description: 'Calendario completo de la temporada',
  },
  {
    title: 'Pilotos',
    href: '/drivers',
    description: 'Información y estadísticas de pilotos',
  },
  {
    title: 'Equipos',
    href: '/constructors',
    description: 'Constructores y sus historiales',
  },
  {
    title: 'Clasificación',
    href: '/standings',
    description: 'Campeonato de pilotos y constructores',
  },
  {
    title: 'Resultados',
    href: '/results',
    description: 'Resultados carrera a carrera',
  },
  {
    title: 'Telemetría',
    href: '/telemetry',
    description: 'Datos de sesión en tiempo real',
  },
  {
    title: 'Análisis',
    href: '/analysis',
    description: 'Telemetría detallada y comparación de vueltas',
  },
] as const;
