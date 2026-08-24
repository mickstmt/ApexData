import { NextResponse, type NextRequest } from 'next/server';
import { Limitador, presupuestoDe, quienPide } from '@/lib/limite-peticiones';

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
 */

const limitador = new Limitador();

export function middleware(peticion: NextRequest) {
  const cupo = presupuestoDe(peticion.nextUrl.pathname);
  if (!cupo) return NextResponse.next();

  // La clave lleva la clase además de la dirección: cada tipo de ruta tiene su
  // propio cubo, así que gastarse la telemetría no cierra la puerta a lo barato.
  const { permitida, esperarSegundos } = limitador.consultar(
    `${cupo.clase}:${quienPide(peticion.headers)}`,
    cupo.presupuesto,
    Date.now()
  );

  if (permitida) return NextResponse.next();

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

export const config = {
  matcher: '/api/:path*',
};
