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
    github: 'https://github.com/yourusername/apexdata', // TODO: Update with actual repo
  },
  creator: 'ApexData Team',
} as const;

export const navItems = [
  {
    title: 'Dashboard',
    href: '/',
    description: 'Vista general de la temporada actual',
  },
  {
    title: 'Calendario',
    href: '/calendario',
    description: 'Calendario completo de la temporada',
  },
  {
    title: 'Pilotos',
    href: '/pilotos',
    description: 'Información y estadísticas de pilotos',
  },
  {
    title: 'Equipos',
    href: '/equipos',
    description: 'Constructores y sus historiales',
  },
  {
    title: 'Temporadas',
    href: '/temporadas',
    description: 'Explora temporadas históricas',
  },
  {
    title: 'Circuitos',
    href: '/circuitos',
    description: 'Información de todos los circuitos',
  },
] as const;
