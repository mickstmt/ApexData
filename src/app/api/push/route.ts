import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  MAXIMO_AUTH,
  MAXIMO_P256DH,
  claveDePushValida,
  destinoDePushValido,
} from '@/lib/push-destino';

export const dynamic = 'force-dynamic';

/**
 * Alta y baja de suscripciones a los avisos.
 *
 * No hay cuentas ni sesión: la dirección que da el navegador es lo que
 * identifica a la suscripción, y por eso es la clave única. Alguien que
 * reinstale la app llega con una dirección nueva; la vieja se limpiará sola al
 * primer envío fallido.
 *
 * Se guarda con `upsert` y no con `create` porque el navegador puede volver a
 * suscribirse con la misma dirección —al reactivar los avisos, por ejemplo— y
 * eso no debería ser un error.
 */

interface Cuerpo {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(request: NextRequest) {
  let datos: Cuerpo;

  try {
    datos = (await request.json()) as Cuerpo;
  } catch {
    return NextResponse.json({ error: 'Cuerpo ilegible.' }, { status: 400 });
  }

  const { endpoint, keys } = datos;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { error: 'Faltan la dirección o las claves de la suscripción.' },
      { status: 400 }
    );
  }

  // Esta es la única ruta pública que escribe en la base, y no tiene sesión
  // detrás: lo que no se compruebe aquí, no se comprueba en ningún sitio. Ver
  // `push-destino.ts` para las tres cosas que esto cierra.
  if (!destinoDePushValido(endpoint)) {
    return NextResponse.json(
      { error: 'Esa dirección no es la de un servicio de avisos conocido.' },
      { status: 400 }
    );
  }

  if (
    !claveDePushValida(keys.p256dh, MAXIMO_P256DH) ||
    !claveDePushValida(keys.auth, MAXIMO_AUTH)
  ) {
    return NextResponse.json(
      { error: 'Las claves de la suscripción no tienen la forma esperada.' },
      { status: 400 }
    );
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        // Solo para saber desde qué clase de aparato llegan, sin identificar a
        // nadie: no hay cuentas y esto no se cruza con nada.
        userAgent: request.headers.get('user-agent')?.slice(0, 255) ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[push] No se pudo guardar la suscripción:', error);
    return NextResponse.json({ error: 'No se pudo guardar la suscripción.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  let endpoint: string | undefined;

  try {
    ({ endpoint } = (await request.json()) as Cuerpo);
  } catch {
    return NextResponse.json({ error: 'Cuerpo ilegible.' }, { status: 400 });
  }

  if (!endpoint) {
    return NextResponse.json({ error: 'Falta la dirección.' }, { status: 400 });
  }

  // `deleteMany` y no `delete`: darse de baja dos veces no es un error, y con
  // `delete` la segunda vez respondería 500 por no encontrar la fila.
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });

  return NextResponse.json({ ok: true });
}
