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
 * Primary navigation, consumed by the header (desktop bar and mobile sheet).
 * `primary: false` keeps an entry out of the always-visible desktop row, which
 * otherwise overflows its container on narrow laptops and iPads.
 */
export const navItems = [
  { title: 'Inicio', href: '/', primary: true },
  { title: 'Pilotos', href: '/drivers', primary: true },
  { title: 'Equipos', href: '/constructors', primary: true },
  { title: 'Calendario', href: '/calendar', primary: true },
  { title: 'Clasificación', href: '/standings', primary: true },
  { title: 'Resultados', href: '/results', primary: true },
  { title: 'Circuitos', href: '/circuits', primary: false },
  { title: 'Telemetría', href: '/analysis', primary: false },
  { title: 'Favoritos', href: '/favorites', primary: false },
] as const;
