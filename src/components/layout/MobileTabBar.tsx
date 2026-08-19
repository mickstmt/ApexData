'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import { CalendarDays, Home, Trophy, Users, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Bottom tab bar, the primary navigation on phones.
 *
 * An installed iOS web app has no browser chrome and no back button, so
 * reaching the main sections has to be possible from anywhere in the app.
 * The bar sits above the home indicator via the safe-area inset; the `max()`
 * keeps sane padding on devices that report no inset at all.
 */
const TABS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/calendar', label: 'Calendario', icon: CalendarDays },
  { href: '/standings', label: 'Clasificación', icon: Trophy },
  { href: '/drivers', label: 'Pilotos', icon: Users },
  { href: '/analysis', label: 'Telemetría', icon: Gauge },
] as const;

/**
 * Rutas que no tienen pestaña propia pero pertenecen a una.
 *
 * Sin esto, estando en `/results` o en `/circuits` la barra no marcaba nada y
 * la app se sentía «fuera de sitio»: se llega a ellas desde el calendario y
 * desde la home, así que es ahí donde el usuario cree estar.
 */
const PERTENENCIA: Record<string, string> = {
  '/results': '/calendar',
  '/circuits': '/calendar',
  '/constructors': '/standings',
  '/compare': '/drivers',
  '/favorites': '/drivers',
  '/telemetry': '/analysis',
};

export function MobileTabBar() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const seccion =
    Object.entries(PERTENENCIA).find(([ruta]) => pathname.startsWith(ruta))?.[1] ?? null;

  // Volver arriba al tocar la pestaña en la que ya estás: es lo que hace
  // cualquier app nativa, y aquí no hacía nada.
  const alTocar = (href: string, activa: boolean) => (evento: React.MouseEvent) => {
    if (!activa) return;
    evento.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 border-t border-border md:hidden',
        'bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65',
        'pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2'
      )}
    >
      <ul className="flex items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href) || seccion === href;

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                onClick={alTocar(href, active)}
                className={cn(
                  // 44px is the minimum comfortable touch target on iOS.
                  'flex min-h-[44px] select-none flex-col items-center justify-center gap-1 px-1 py-1',
                  'text-[10px] font-medium transition-colors',
                  // La app desactiva el resaltado gris de iOS al tocar, así que
                  // sin esto pulsar no producía ninguna señal: parecía que la
                  // pestaña no respondía hasta que llegaba la página nueva.
                  'rounded-lg active:scale-95 active:bg-accent motion-reduce:active:scale-100',
                  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
