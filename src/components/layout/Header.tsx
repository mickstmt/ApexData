'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { navItems } from '@/config/site';
import { cn } from '@/lib/utils';

const primaryItems = navItems.filter((item) => item.primary);

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    // The safe-area padding pushes this below the notch / Dynamic Island once
    // the app runs standalone; on the web the inset is 0 and nothing changes.
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
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
            className="rounded-md p-2 text-foreground hover:bg-accent"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="border-t border-border bg-background">
          <div className="container mx-auto grid grid-cols-2 gap-1 px-4 py-4 sm:grid-cols-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'rounded-md px-3 py-2 text-base font-medium hover:bg-accent hover:text-primary',
                  isActive(item.href) ? 'text-foreground' : 'text-foreground/60'
                )}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
