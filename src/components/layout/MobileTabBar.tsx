'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
];

export function MobileTabBar() {
  const pathname = usePathname();

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
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  // 44px is the minimum comfortable touch target on iOS.
                  'flex min-h-[44px] select-none flex-col items-center justify-center gap-1 px-1 py-1',
                  'text-[10px] font-medium transition-colors',
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
