'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { ThemeToggle } from './ThemeToggle';
import { navItems } from '@/config/site';
import { cn } from '@/lib/utils';

const primaryItems = navItems.filter((item) => item.primary);

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  // `Escape`, el foco atrapado dentro y el foco devuelto al botón ya no se
  // escriben aquí: los da `<dialog>` a través de `Sheet`. Lo que había antes
  // solo cubría lo primero.
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    // The safe-area padding pushes this below the notch / Dynamic Island once
    // the app runs standalone; on the web the inset is 0 and nothing changes.
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* El velo del equipo favorito. Va como capa encima del fondo y no en
          lugar de él, para no perder el desenfoque; y como `--ambiente` vale
          por defecto lo mismo que el fondo, sin equipo elegido no se ve. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-ambiente/[0.14]" />
      <nav className="container relative mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center">
          <span className="font-display text-2xl font-bold tracking-tight">
            <span className="text-foreground">Apex</span>
            <span className="text-primary">Data</span>
          </span>
        </Link>

        {/* Only the primary entries sit in the bar; the rest are behind "Más",
            which keeps the row from wrapping on iPads and small laptops. */}
        <div className="hidden items-center gap-5 lg:flex">
          {primaryItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                isActive(item.href) ? 'text-foreground' : 'text-foreground/60'
              )}
            >
              {item.title}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-md text-foreground ring-offset-background hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-10 md:w-10"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls="menu-secciones"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      <Sheet abierta={menuOpen} alCerrar={() => setMenuOpen(false)} titulo="Secciones">
        <div id="menu-secciones" className="grid grid-cols-2 gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'flex min-h-[44px] items-center rounded-md px-3 text-base font-medium hover:bg-accent hover:text-primary',
                isActive(item.href) ? 'text-foreground' : 'text-foreground/60'
              )}
            >
              {item.title}
            </Link>
          ))}
        </div>
      </Sheet>
    </header>
  );
}
