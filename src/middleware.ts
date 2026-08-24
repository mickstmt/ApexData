import { NextResponse, type NextRequest } from 'next/server';
import { Limitador, presupuestoDe, quienPide } from '@/lib/limite-peticiones';
import { llevaPolitica, nuevoNonce, politicaDeContenido } from '@/lib/csp';

/**
 * El límite de peticiones, aplicado antes que nada.
 *
 * La auditoría del 2026-08-24 encontró varias formas de hacer trabajar mucho al
 * servidor con muy poco esfuerzo, y todas compartían la misma causa: **nada
 * impedía repetirlas**. Esto es lo que corta esa raíz, y por eso va en el
 * middleware y no en cada ruta: una ruta nueva queda cubierta el día que se
 * crea, sin que nadie tenga que acordarse.
 *
 * Solo se limita `/api/*`. Las páginas se sirven cacheadas y su coste ya está
 * medido; meterlas aquí castigaría a quien navega rápido sin ganar nada.
 *
 * El estado vive en memoria del proceso. Con un solo contenedor eso es exacto;
 * si algún día hubiera varios, cada uno llevaría su cuenta y el límite real
 * sería el múltiplo. Se dice aquí para que no sorprenda.
 *
 * Aquí también nace el **nonce** de la política de contenido. Tiene que ser
 * aquí y no en el layout porque debe ir en dos sitios a la vez: en la cabecera
 * de la respuesta y en el HTML, y el layout solo puede escribir lo segundo.
 * Viaja al layout como cabecera de la petición.
 */

const limitador = new Limitador();

export function middleware(peticion: NextRequest) {
  const ruta = peticion.nextUrl.pathname;
  const cupo = presupuestoDe(ruta);

  if (!cupo) return conPolitica(peticion, ruta);

  // La clave lleva la clase además de la dirección: cada tipo de ruta tiene su
  // propio cubo, así que gastarse la telemetría no cierra la puerta a lo barato.
  const { permitida, esperarSegundos } = limitador.consultar(
    `${cupo.clase}:${quienPide(peticion.headers)}`,
    cupo.presupuesto,
    Date.now()
  );

  if (permitida) return conPolitica(peticion, ruta);

  return NextResponse.json(
    {
      error: 'Demasiadas peticiones seguidas. Prueba de nuevo en un momento.',
      esperarSegundos,
    },
    {
      status: 429,
      headers: {
        // `Retry-After` no es decorativo: es lo que hace que un cliente educado
        // espere en vez de insistir, y lo que distingue esto de una caída.
        'Retry-After': String(esperarSegundos),
        'Cache-Control': 'no-store',
      },
    }
  );
}

/**
 * La respuesta, con su política y su nonce si es un documento.
 *
 * El nonce se pasa al layout por una cabecera de PETICIÓN: es la única forma de
 * que el HTML lleve el mismo número que la cabecera de la respuesta. Leerlo en
 * el layout hace que las páginas se sirvan siempre en el momento, que es lo que
 * ya hacían casi todas.
 */
function conPolitica(peticion: NextRequest, ruta: string) {
  if (!llevaPolitica(ruta)) return NextResponse.next();

  const nonce = nuevoNonce();
  const cabeceras = new Headers(peticion.headers);
  cabeceras.set('x-nonce', nonce);

  const respuesta = NextResponse.next({ request: { headers: cabeceras } });
  respuesta.headers.set(
    'Content-Security-Policy',
    politicaDeContenido(nonce, process.env.NODE_ENV !== 'production')
  );

  return respuesta;
}

export const config = {
  matcher: [
    /**
     * Todo menos lo que no es un documento ni una ruta de datos.
     *
     * Los archivos con nombre de huella (`/_next/static/…`) se sirven miles de
     * veces y no ejecutan nada: pasarlos por aquí sería trabajo por nada. Sus
     * cabeceras las pone `next.config.ts`.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|images/|icons/|splash/).*)',
  ],
};
