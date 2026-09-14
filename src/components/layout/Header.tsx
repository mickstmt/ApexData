'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { RejillaDeSecciones } from './Secciones';
import { PanelDeAjustes, type Cuenta } from './PanelDeAjustes';
import type { ViasDeAcceso } from '@/lib/cuentas/disponible';
import { navItems } from '@/config/site';
import { cn } from '@/lib/utils';

export function Header({
  cuenta,
  vias,
}: {
  /** Quien ha entrado, leído en el servidor. `null` es «nadie». */
  cuenta: Cuenta | null;
  vias: ViasDeAcceso;
}) {
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
      <nav className="container relative mx-auto flex h-16 items-center gap-5 px-4">
        <Link href="/" className="flex shrink-0 items-center">
          <span className="font-display text-2xl font-bold tracking-tight">
            <span className="text-foreground">Apex</span>
            <span className="text-primary">Data</span>
          </span>
        </Link>

        {/* Las secciones NO están aquí.

            Estaban: seis enlaces en fila, y los otros tres detrás de un botón.
            A partir de `lg` viven en el raíl de la izquierda, donde caben las
            nueve y se leen a la vez. Lo que queda arriba es lo que no es una
            sección —habla de la app, no lleva a datos—, que es exactamente el
            reparto de las referencias: cabecera casi vacía, navegación al
            lado. */}
        <div className="hidden items-center gap-5 lg:flex">
          <Link
            href="/acerca"
            aria-current={isActive('/acerca') ? 'page' : undefined}
            className={cn(
              'text-sm font-medium transition-colors hover:text-primary',
              isActive('/acerca') ? 'text-foreground' : 'text-foreground/60'
            )}
          >
            Acerca de
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            // Solo entre `md` y `lg`, que es la única franja sin navegación.
            //
            // Debajo de `md` el menú se abre desde «Más», abajo, al alcance del
            // pulgar; dejar aquí un segundo botón para lo mismo sería dar dos
            // puertas a la misma habitación. Y a partir de `lg` está el raíl,
            // que enseña las nueve sin abrir nada: ahí este botón sería la
            // tercera puerta.
            className="hidden h-11 w-11 items-center justify-center rounded-md text-foreground ring-offset-background hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:flex md:h-10 md:w-10 lg:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls="menu-secciones"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          {/* El último de la fila, que es donde lo busca la mano. Dentro van la
              cuenta y el tema; el tema estaba aquí fuera y ya no. */}
          <PanelDeAjustes cuenta={cuenta} vias={vias} />
        </div>
      </nav>

      {/* Aquí van TODAS, y no solo las que faltan.
          
          Este menú solo existe entre `md` y `lg`, donde no hay barra de
          pestañas ni enlaces en la cabecera: no hay nada «ya visible» que
          repetir, así que es toda la navegación de la app. */}
      <Sheet abierta={menuOpen} alCerrar={() => setMenuOpen(false)} titulo="Secciones">
        <div id="menu-secciones">
          <RejillaDeSecciones
            secciones={navItems}
            alElegir={() => setMenuOpen(false)}
            rutaActual={pathname}
          />
        </div>
      </Sheet>
    </header>
  );
}
