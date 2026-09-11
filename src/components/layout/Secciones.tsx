'use client';

import Link from 'next/link';
import {
  CalendarDays,
  Flag,
  Gauge,
  Home,
  Info,
  Route,
  Shield,
  Star,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { navItems } from '@/config/site';
import { cn } from '@/lib/utils';

/**
 * Las secciones de la app, en rejilla y con icono.
 *
 * ## Por qué con icono
 *
 * La lista anterior era una columna de nombres sueltos y se leía como un
 * índice, no como una app. Con icono cada casilla se reconoce sin leerla, que
 * es de lo que vive un menú al que se entra de pasada.
 *
 * ## Por qué recibe qué enseñar en vez de decidirlo
 *
 * Depende de lo que YA esté a la vista, y eso cambia con el ancho: en el móvil
 * hay una barra abajo con cuatro secciones, así que el menú es «lo que no cabía»
 * y repetirlas sería ruido; entre `md` y `lg` no hay barra ni enlaces en la
 * cabecera, así que ahí el menú es toda la navegación que existe.
 *
 * Un menú llamado «Más» que lo contiene todo no es «más» de nada, y la etiqueta
 * dejaría de significar lo que dice.
 */

/** Una entrada de la navegación, tal como la declara `site.ts`. */
export type Seccion = (typeof navItems)[number];

/** El icono de cada sección, por su ruta. */
const ICONOS: Record<string, LucideIcon> = {
  '/': Home,
  '/drivers': Users,
  '/constructors': Shield,
  '/calendar': CalendarDays,
  '/standings': Trophy,
  '/results': Flag,
  '/circuits': Route,
  '/analysis': Gauge,
  '/favorites': Star,
};

/** Las rutas que viven en la barra inferior y por tanto no van en el menú. */
export const EN_LA_BARRA = ['/', '/calendar', '/standings', '/drivers'] as const;

/** Lo que enseña el menú en el móvil: lo que no está ya abajo. */
export const FUERA_DE_LA_BARRA: readonly Seccion[] = navItems.filter(
  (item) => !EN_LA_BARRA.includes(item.href as (typeof EN_LA_BARRA)[number])
);

export function RejillaDeSecciones({
  secciones,
  alElegir,
  rutaActual,
}: {
  secciones: readonly Seccion[];
  alElegir: () => void;
  rutaActual: string;
}) {
  return (
    <>
      <div data-rejilla-de-secciones className="grid grid-cols-3 gap-1">
      {secciones.map((item) => {
        const Icono = ICONOS[item.href] ?? Route;
        const activa = item.href === '/' ? rutaActual === '/' : rutaActual.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={alElegir}
            aria-current={activa ? 'page' : undefined}
            className={cn(
              // 44 px de alto mínimo los cubre de sobra: la casilla entera es
              // el objetivo, no solo el icono.
              'flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl px-1 py-3',
              'text-center text-xs ring-offset-background transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              activa ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              'hover:bg-accent'
            )}
          >
            <span
              aria-hidden
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-[13px]',
                activa ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
              )}
            >
              <Icono className="h-[22px] w-[22px]" />
            </span>
            {item.title}
          </Link>
        );
      })}
      </div>

      {/* «Acerca de» va DEBAJO y no dentro de la rejilla.

          Dos razones, y ninguna es estética. No es una sección: no lleva a
          datos, habla de la app. Y las secciones son nueve, que en tres
          columnas son tres filas exactas; meterla dentro haría diez y dejaría
          una baldosa sola en la última fila.

          Tiene que estar aquí porque es donde se acredita a Jolpica y a
          OpenF1, y su licencia —CC BY-NC-SA 4.0— lo exige. Eso vivía solo en
          el pie, y el pie no se pinta en la app instalada. */}
      <Link
        href="/acerca"
        onClick={alElegir}
        aria-current={rutaActual.startsWith('/acerca') ? 'page' : undefined}
        className={cn(
          'mt-1 flex min-h-[44px] items-center gap-3 rounded-xl border-t border-border px-3 pt-3',
          'text-sm ring-offset-background transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          rutaActual.startsWith('/acerca')
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Info className="h-[18px] w-[18px] text-primary" aria-hidden />
        Acerca de ApexData
      </Link>
    </>
  );
}
