'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import { Home, LayoutGrid } from 'lucide-react';
import { BanderaCuadros, Casco, Podio } from '@/components/iconos/motor';
import { cn } from '@/lib/utils';
import { Sheet } from '@/components/ui/Sheet';
import { FUERA_DE_LA_BARRA, RejillaDeSecciones } from './Secciones';

/**
 * La barra inferior: la navegación principal en el teléfono.
 *
 * Una app instalada no tiene ni barra del navegador ni botón de volver, así
 * que llegar a las secciones tiene que ser posible desde cualquier sitio.
 *
 * ## Por qué flota
 *
 * Antes iba pegada a los tres bordes y era opaca: un tapón. Ahora es una
 * píldora despegada y translúcida, y el contenido corre por debajo. Eso no es
 * adorno —da la sensación de que la lista sigue, que es lo que hace que la
 * pantalla parezca más alta sin esconder nada al desplazar.
 *
 * Las medidas están afinadas con el usuario sobre maqueta, contra las
 * referencias que trajo él (WhatsApp, Flashscore, Apple Music): alto 68,
 * **26 a los lados y 20 abajo**, píldora completa, icono 26 y etiqueta 11,5.
 * El cristal vive en `--barra-cristal`.
 *
 * Los 20 de abajo se miden **desde el borde**, sin sumar el área segura. Ver el
 * porqué en el `bottom` de la propia barra: no es solo estético, es lo que la
 * mantenía anclada al desplazar.
 *
 * ## Lo que NO se negocia
 *
 * El área tocable no baja de 44 px aunque el icono mida 26: lo que se toca es
 * la casilla entera, no el dibujo.
 */
/**
 * Las etiquetas son cortas por una medida, no por gusto.
 *
 * «Clasificación» ocupaba **71 px de texto en una casilla de 60** al ancho de
 * un Android, y por eso se salía del realce al marcarla. Encogerla a 10 px la
 * dejaba al 95 % —sin margen— y recortarla con puntos daba «Clasifica…», que
 * no dice nada. «Puntos» se queda en el 62 % y dice lo mismo.
 *
 * El nombre completo no se pierde: va en `nombre`, que es lo que se anuncia, y
 * contiene la palabra visible a propósito — un nombre accesible que no incluya
 * el texto que se ve deja fuera a quien maneja el teléfono por voz.
 */
const TABS = [
  { href: '/', label: 'Inicio', nombre: 'Inicio', icon: Home },
  { href: '/calendar', label: 'Fechas', nombre: 'Fechas del calendario', icon: BanderaCuadros },
  { href: '/standings', label: 'Puntos', nombre: 'Puntos de la clasificación', icon: Podio },
  { href: '/drivers', label: 'Pilotos', nombre: 'Pilotos', icon: Casco },
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

    const publicar = () => {
      // Cuánto TAPA, no cuánto mide: desde que flota, entre su borde inferior
      // y el de la pantalla queda un margen que también hay que esquivar. Con
      // `offsetHeight` a secas, lo último de cada página se colaba ahí debajo.
      const caja = nodo.getBoundingClientRect();
      const tapa = caja.height === 0 ? 0 : Math.round(window.innerHeight - caja.top);
      document.documentElement.style.setProperty('--barra-inferior', `${tapa}px`);
    };

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

  /** Pone el realce sobre una casilla, midiéndola del DOM. */
  const colocarPildora = useCallback((casilla: HTMLElement | null) => {
    const nodo = lista.current;
    if (!nodo || !casilla) return;

    const caja = casilla.getBoundingClientRect();
    const contenedor = nodo.getBoundingClientRect();
    setPildora({
      opacity: 1,
      width: `${caja.width}px`,
      transform: `translateX(${caja.left - contenedor.left}px)`,
    });
  }, []);

  useEffect(() => {
    const nodo = lista.current;
    if (!nodo) return;

    const medir = () => {
      const activa = nodo.querySelector<HTMLElement>('[aria-current="page"]');
      if (!activa) return setPildora({ opacity: 0 });
      colocarPildora(activa);
    };

    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [pathname, colocarPildora]);

  /**
   * A dónde se ha tocado mientras la ruta todavía dice otra cosa.
   *
   * `pathname` es la ruta **ya cambiada**, no la que se está pidiendo, así que
   * entre tocar y llegar sigue diciendo la de antes. Sin esta cuenta, tocar
   * Pilotos y enseguida Inicio hacía que el segundo toque se comparara con la
   * ruta vieja —«si ya estás en Inicio»—, se quedara en un desplazamiento y no
   * navegara. El usuario lo describió como «no responde».
   */
  const destinoPendiente = useRef<string | null>(null);

  useEffect(() => {
    destinoPendiente.current = null;
  }, [pathname]);

  const alTocar = (href: string) => (evento: React.MouseEvent<HTMLAnchorElement>) => {
    // Se mide la CASILLA, no el enlace.
    //
    // El enlace lleva `active:scale-[.92]` mientras el dedo está encima, así
    // que medirlo dentro de su propio manejador devuelve el 92 % de su ancho:
    // el realce viajaba encogido y solo se ajustaba al aterrizar la ruta.
    // Medido: 184 px en vez de 200. La casilla que lo envuelve no se escala.
    //
    // El realce arranca al TOCAR, no al llegar.
    //
    // Estaba atado al cambio de ruta, que en el teléfono llega tarde: para
    // cuando la página nueva se montaba, el realce aparecía ya puesto en su
    // destino. Por eso se veían «salida y llegada» y nunca el viaje — el
    // recorrido sí ocurría, pero contra una pantalla que aún no se pintaba.
    colocarPildora(evento.currentTarget.parentElement);

    // Un toque mientras se va a otro sitio es un cambio de idea: que navegue.
    const enVuelo = destinoPendiente.current;
    if (enVuelo !== null && enVuelo !== href) {
      destinoPendiente.current = href;
      return;
    }

    if (pathname !== href) {
      destinoPendiente.current = href;
      return;
    }

    // Volver arriba al tocar la pestaña en la que ya estás: es lo que hace
    // cualquier app nativa, y aquí no hacía nada.
    evento.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <>
      <nav
        ref={barra}
        aria-label="Navegación principal"
        className={cn(
          // Píldora despegada de los tres bordes. El redondeo es medio alto:
          // en esta forma no es una preferencia, es lo que la hace píldora.
          'fixed inset-x-[26px] z-50 h-[68px] rounded-[34px] p-[5px] md:hidden',
          // Veinte píxeles del borde de VERDAD, sin sumar el área segura.
          //
          // Sumarla hacía dos cosas malas. La visible: en un iPhone son ~34 px,
          // así que la barra quedaba a más de cincuenta del cristal, lejos de
          // WhatsApp y Flashscore — que dejan que el indicador del sistema les
          // caiga encima, y es lo que el usuario pedía enseñando esas capturas.
          //
          // Y la que costó encontrar: **la barra se despegaba al desplazar**.
          // iOS reevalúa `env(safe-area-inset-bottom)` durante el gesto, así que
          // un `bottom` que dependiera de él se movía con la página y se quedaba
          // donde lo dejaras. Medido sobre una maqueta instalada en el teléfono:
          // con `env()` se iba, sin él se queda quieta, y es el único cambio de
          // posicionamiento entre las dos versiones.
          'bottom-[20px]',
          'border border-[var(--barra-borde)] shadow-[0_10px_34px_rgba(0,0,0,0.45)]',
          // El cristal. Poco desenfoque a propósito: medido, con 6 px ya no se
          // ve nada de lo que pasa por debajo, y verlo es el objetivo.
          'bg-[var(--barra-cristal)] backdrop-blur-[2px] backdrop-saturate-[1.8]'
        )}
      >
      <ul ref={lista} className="relative flex h-full items-stretch">
        {/* La píldora viaja entre pestañas en vez de aparecer y desaparecer:
            da continuidad espacial a la navegación principal. Va detrás del
            contenido y no captura toques. */}
        <li
          aria-hidden
          // Envuelve la casilla entera —icono Y etiqueta—, no solo el icono.
          // Es lo que hace reconocible el patrón de WhatsApp y Flashscore; con
          // un círculo detrás del icono no se lee igual.
          className="barra-realce pointer-events-none absolute inset-y-0 left-0 rounded-[20px] bg-primary/[.13]"
          style={pildora}
        />

        {TABS.map(({ href, label, nombre, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href) || seccion === href;

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                aria-label={nombre === label ? undefined : nombre}
                onClick={alTocar(href)}
                className={cn(
                  // El alto es el de la casilla entera: lo que se toca no es el
                  // dibujo, y 44 px sigue siendo el mínimo aunque el icono mida 26.
                  'flex h-full min-h-[44px] select-none flex-col items-center justify-center gap-[3px]',
                  'text-[11.5px] font-medium leading-none transition-colors',
                  // La app desactiva el resaltado gris de iOS al tocar, así que
                  // sin esto pulsar no producía ninguna señal: parecía que la
                  // pestaña no respondía hasta que llegaba la página nueva.
                  'barra-toque relative rounded-[20px] transition-transform duration-[120ms] active:scale-[.92] motion-reduce:active:scale-100',
                  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-[26px] w-[26px]" aria-hidden />
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
              'flex h-full min-h-[44px] w-full select-none flex-col items-center justify-center gap-[3px]',
              'text-[11.5px] font-medium leading-none transition-colors',
              'barra-toque relative rounded-[20px] transition-transform duration-[120ms] active:scale-[.92] motion-reduce:active:scale-100',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              menuAbierto ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="h-[26px] w-[26px]" aria-hidden />
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
