import { NextResponse } from 'next/server';
import { BUILD_ID } from '@/lib/build-id';

export const dynamic = 'force-dynamic';

/**
 * Qué compilación está sirviendo ahora mismo. Nada más.
 *
 * Existe para que el service worker pueda ponerle nombre a sus cachés con el
 * identificador de la compilación. Antes ese número estaba **escrito a mano**
 * en `public/sw.js`, con un comentario que pedía subirlo en cualquier entrega
 * que cambiara el HTML. Se olvidó, y un móvil con la app instalada siguió
 * sirviendo la página guardada mientras la hidrataba el JavaScript nuevo:
 * React descartaba el HTML del servidor y volvía a pintar en el cliente.
 *
 * Es un endpoint aparte de `/api/health` a propósito: aquél consulta la base y
 * el servicio de telemetría en cada llamada, y esto se pregunta cada vez que la
 * app vuelve al primer plano. Aquí no se toca nada: el valor se lee una vez al
 * arrancar el proceso.
 */
export function GET() {
  return NextResponse.json(
    { buildId: BUILD_ID },
    // Sin caché: el sentido de preguntarlo es enterarse de que ha cambiado.
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
