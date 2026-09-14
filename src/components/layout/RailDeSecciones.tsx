'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Route } from 'lucide-react';

import { navItems } from '@/config/site';
import { esPantallaCompleta } from '@/lib/pantallas-completas';
import { cn } from '@/lib/utils';
import { ICONOS } from './Secciones';

/**
 * Las nueve secciones, en una columna a la izquierda del contenido.
 *
 * ## Por qué existe
 *
 * En el escritorio la navegación de la app era la del teléfono estirada: seis
 * enlaces en la cabecera, los otros tres detrás de un botón «Más» que abría una
 * hoja modal —una hoja de teléfono, en un monitor—. El usuario lo señaló al ver
 * la web (punto 45 de MEJORAS-PENDIENTES) y las referencias que trajo
 * —FotMob, Flashscore— hacen lo contrario: la cabecera se queda casi vacía y la
 * navegación larga baja a un raíl lateral, donde las secciones caben todas, se
 * leen a la vez y no hay nada que abrir.
 *
 * ## Dónde empieza y dónde no
 *
 * A partir de `lg` (1024 px), que es justo donde el ancho da para el raíl (232)
 * y aún deja al contenido por encima de los 700 px en los que una tabla deja de
 * leerse. Por debajo no aparece y no cambia nada: en el teléfono manda la barra
 * flotante y entre `md` y `lg` manda el botón de la cabecera, que ahí sigue
 * siendo la única navegación que hay.
 *
 * ## Por qué no lleva «Acerca de»
 *
 * Porque no es una sección: no lleva a datos, habla de la app. En el raíl vive
 * lo que se visita a diario; «Acerca de» —donde se acredita a Jolpica y OpenF1,
 * que su licencia exige— se queda en la cabecera, igual que en la referencia.
 */
export function RailDeSecciones() {
  const pathname = usePathname();

  // El replay ocupa la ventana entera y de él no se navega: se mira. Es la
  // misma lista de la que se aparta el pie, y por eso está compartida.
  if (esPantallaCompleta(pathname)) return null;

  return (
    <div className="hidden w-[232px] shrink-0 pl-4 lg:block">
      {/* Se queda a la vista al desplazarse, como la cabecera. `top` es el alto
          de la cabecera pegajosa más lo que el iPhone se guarda arriba; sin
          esto el raíl se metería debajo de ella. */}
      <nav
        aria-label="Secciones"
        className="sticky top-[calc(4rem+env(safe-area-inset-top))] max-h-[calc(100dvh-5rem)] overflow-y-auto py-4"
      >
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icono = ICONOS[item.href] ?? Route;
            const activa =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={activa ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[40px] items-center gap-3 rounded-[10px] px-3 text-sm',
                    'ring-offset-background transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    activa
                      ? // El 12 % del acento es un velo, no tinta: el color de
                        // marca crudo como fondo dejaría el texto por debajo de
                        // 4.5:1 en claro. La tinta va del acento entero, que sí
                        // pasa sobre el fondo de la tarjeta.
                        'bg-primary/[0.12] font-semibold text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icono className="h-[18px] w-[18px] shrink-0" aria-hidden />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
