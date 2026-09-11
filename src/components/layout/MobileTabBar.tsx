'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import { CalendarDays, Home, LayoutGrid, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet } from '@/components/ui/Sheet';
import { FUERA_DE_LA_BARRA, RejillaDeSecciones } from './Secciones';

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
] as const;

/**
 * La quinta pestaña no es una sección: abre el resto.
 *
 * Antes el menú se abría desde la esquina superior derecha, **a 812 píxeles del
 * borde inferior** —medido en un iPhone de 390×844—, mientras que lo que abría
 * aterrizaba en los últimos 234. O sea: el contenido estaba al alcance del
 * pulgar y la puerta no. Aquí baja a 40.
 *
 * Le cede el sitio «Telemetría», que estaba en la barra pese a no ser una
 * sección principal en `site.ts`. Pasa al menú, con las otras cuatro.
 */
const ETIQUETA_MAS = 'Más';

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
  //
  // La condición es estar EXACTAMENTE en esa ruta, no que la pestaña aparezca
  // marcada: si no, desde `/results` —donde se marca «Calendario» por
  // pertenencia— o desde la ficha de un piloto, el toque se quedaba en un
  // desplazamiento y no había forma de llegar a la sección.
  // Posición y ancho de la pestaña activa, medidos del DOM: los anchos los
  // reparte flex, así que no se pueden calcular de antemano.
  const lista = useRef<HTMLUListElement>(null);
  const barra = useRef<HTMLElement>(null);
  const [pildora, setPildora] = useState<React.CSSProperties>({ opacity: 0 });
  const [menuAbierto, setMenuAbierto] = useState(false);

  // La barra dice cuánto tapa, y así nadie más tiene que adivinarlo.
  //
  // Había cinco suposiciones sueltas por la app —`4rem`, `4.5rem`, `4.75rem`,
  // `5rem`— y ninguna acertaba: el alto sale del icono, de la etiqueta y del
  // borde seguro del teléfono, tres cosas que desde CSS no se pueden sumar de
  // antemano. Los mandos del replay se apartaban `4rem`, cuatro píxeles de
  // más, y por esa rendija asomaba el pie de página en el iPhone.
  //
  // Se mide, no se calcula, por lo mismo que se mide la cabecera en el replay:
  // el compilador no ve el layout. Desde `md` la barra está oculta y mide
  // cero, que es justo lo que hay que publicar.
  useEffect(() => {
    const nodo = barra.current;
    if (!nodo) return;

    const publicar = () =>
      document.documentElement.style.setProperty('--barra-inferior', `${nodo.offsetHeight}px`);

    publicar();
    // El observador ve los cambios de contenido; el de la ventana, el cruce de
    // `md`, donde la barra pasa a `display:none` y el observador puede callar.
    const observador = new ResizeObserver(publicar);
    observador.observe(nodo);
    window.addEventListener('resize', publicar);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', publicar);
      document.documentElement.style.removeProperty('--barra-inferior');
    };
  }, []);

  useEffect(() => {
    const nodo = lista.current;
    if (!nodo) return;

    const medir = () => {
      const activa = nodo.querySelector<HTMLElement>('[aria-current="page"]');
      if (!activa) return setPildora({ opacity: 0 });

      const caja = activa.getBoundingClientRect();
      const contenedor = nodo.getBoundingClientRect();
      setPildora({
        opacity: 1,
        width: `${caja.width}px`,
        transform: `translateX(${caja.left - contenedor.left}px)`,
      });
    };

    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [pathname]);

  const alTocar = (href: string) => (evento: React.MouseEvent) => {
    if (pathname !== href) return;
    evento.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <>
      <nav
        ref={barra}
        aria-label="Navegación principal"
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 border-t border-border md:hidden',
        'bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65',
        'pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2'
      )}
    >
      <ul ref={lista} className="relative flex items-stretch justify-around">
        {/* La píldora viaja entre pestañas en vez de aparecer y desaparecer:
            da continuidad espacial a la navegación principal. Va detrás del
            contenido y no captura toques. */}
        <li
          aria-hidden
          // `inset-y-0` y no `inset-y-1`: con la píldora cuatro píxeles más baja
          // que la fila, su borde superior caía justo en el icono y parecía que
          // el icono se salía del fondo. Ahora la píldora llega arriba y abajo,
          // y el relleno del enlace deja aire por dentro.
          className="pointer-events-none absolute inset-y-0 left-0 rounded-xl bg-primary/10 transition-[transform,width] duration-[260ms] ease-out motion-reduce:transition-none"
          style={pildora}
        />

        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href) || seccion === href;

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                onClick={alTocar(href)}
                className={cn(
                  // 44px is the minimum comfortable touch target on iOS.
                  'flex min-h-[44px] select-none flex-col items-center justify-center gap-1 px-1 py-1.5',
                  'text-[10px] font-medium transition-colors',
                  // La app desactiva el resaltado gris de iOS al tocar, así que
                  // sin esto pulsar no producía ninguna señal: parecía que la
                  // pestaña no respondía hasta que llegaba la página nueva.
                  'relative rounded-lg active:scale-95 motion-reduce:active:scale-100',
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

        <li className="flex-1">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-expanded={menuAbierto}
            aria-haspopup="dialog"
            className={cn(
              'flex min-h-[44px] w-full select-none flex-col items-center justify-center gap-1 px-1 py-1.5',
              'text-[10px] font-medium transition-colors',
              'relative rounded-lg active:scale-95 motion-reduce:active:scale-100',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              menuAbierto ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="h-5 w-5" aria-hidden />
            {ETIQUETA_MAS}
          </button>
        </li>
        </ul>
      </nav>

      {/* El mismo `<dialog>` modal de siempre, en su forma flotante: el panel
          queda por encima de la barra, así que el botón que lo abrió sigue
          viéndose debajo y se entiende de dónde salió. */}
      <Sheet
        abierta={menuAbierto}
        alCerrar={() => setMenuAbierto(false)}
        titulo="Secciones"
        forma="panel"
      >
        <RejillaDeSecciones
          secciones={FUERA_DE_LA_BARRA}
          alElegir={() => setMenuAbierto(false)}
          rutaActual={pathname}
        />
      </Sheet>
    </>
  );
}
