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
 * Las secciones de la app, en el orden en que se ven.
 *
 * Las consumen los tres sitios que navegan: el raíl de escritorio, la hoja de
 * la cabecera entre `md` y `lg`, y la barra flotante del teléfono. Ya no hay
 * marca de «principal»: existía para decidir cuáles de las nueve cabían en la
 * fila de la cabecera, y desde que la navegación larga vive en el raíl no hay
 * ninguna fila que repartir.
 */
export const navItems = [
  { title: 'Inicio', href: '/' },
  { title: 'Pilotos', href: '/drivers' },
  { title: 'Equipos', href: '/constructors' },
  { title: 'Calendario', href: '/calendar' },
  { title: 'Clasificación', href: '/standings' },
  { title: 'Resultados', href: '/results' },
  { title: 'Circuitos', href: '/circuits' },
  { title: 'Telemetría', href: '/analysis' },
  { title: 'Favoritos', href: '/favorites' },
] as const;
