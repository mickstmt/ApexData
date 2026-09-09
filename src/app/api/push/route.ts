import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  MAXIMO_AUTH,
  MAXIMO_P256DH,
  claveDePushValida,
  destinoDePushValido,
} from '@/lib/push-destino';
import { TODAS_LAS_SESIONES } from '@/lib/push/redaccion';

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
  favoriteDrivers?: unknown;
  favoriteConstructors?: unknown;
  sessions?: unknown;
  timezone?: unknown;
}

/** Cuántos favoritos se aceptan. Veintidós pilotos y once equipos, con holgura. */
const MAXIMO_FAVORITOS = 40;

/**
 * La forma de un identificador de Jolpica: `hamilton`, `max_verstappen`,
 * `red_bull`. Nada más entra, porque de aquí sale texto que se guarda y se
 * vuelve a leer para construir consultas.
 */
const ID_VALIDO = /^[a-z0-9_]{1,40}$/i;

/**
 * Una lista de identificadores lista para guardar, o `undefined` si no vino.
 *
 * Devuelve cadena vacía cuando la lista llega vacía a propósito —«no sigo a
 * nadie»— porque eso es distinto de no haber mandado el campo, que significa
 * «no toques lo que ya había».
 */
function listaDeIds(valor: unknown): string | undefined | null {
  if (valor === undefined) return undefined;
  if (!Array.isArray(valor)) return null;
  if (valor.length > MAXIMO_FAVORITOS) return null;

  const limpios: string[] = [];

  for (const bruto of valor) {
    if (typeof bruto !== 'string') return null;
    const id = bruto.trim();
    if (!ID_VALIDO.test(id)) return null;
    if (!limpios.includes(id)) limpios.push(id);
  }

  return limpios.join(',');
}

/**
 * El huso horario, comprobado contra lo que el propio motor reconoce.
 *
 * No se valida con una expresión regular sino pidiéndole a `Intl` que lo use:
 * la lista de husos cambia con el mundo —países que la cambian, zonas que se
 * renombran— y una expresión escrita a mano envejece mal. Si `Intl` lo acepta,
 * es un huso que este servidor sabe manejar, que es justo la condición que hace
 * falta para calcular las 20:00 de alguien.
 */
function husoValido(valor: unknown): string | undefined | null {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string') return null;

  const huso = valor.trim();
  if (!huso || huso.length > 64) return null;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: huso });
    return huso;
  } catch {
    return null;
  }
}

/** Los códigos de sesión elegidos, comprobados contra los siete que existen. */
function listaDeSesiones(valor: unknown): string | undefined | null {
  if (valor === undefined) return undefined;
  if (!Array.isArray(valor)) return null;

  const limpios: string[] = [];

  for (const bruto of valor) {
    if (typeof bruto !== 'string') return null;
    const codigo = bruto.trim();
    if (!TODAS_LAS_SESIONES.includes(codigo)) return null;
    if (!limpios.includes(codigo)) limpios.push(codigo);
  }

  return limpios.join(',');
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

  // Los favoritos viajan con la suscripción porque es el aviso quien los
  // necesita: sin ellos el servidor no puede escribir «Antonelli 5.º» y solo
  // sabe decir quién fue el más rápido.
  const pilotos = listaDeIds(datos.favoriteDrivers);
  const equipos = listaDeIds(datos.favoriteConstructors);
  const sesiones = listaDeSesiones(datos.sessions);
  // Sin huso no hay previa: es lo que decide a qué hora son «las 20:00» de esta
  // persona. Los avisos de resultado le siguen llegando igual.
  const huso = husoValido(datos.timezone);

  if (pilotos === null || equipos === null || sesiones === null || huso === null) {
    return NextResponse.json(
      { error: 'Los favoritos, las sesiones o el huso horario no tienen la forma esperada.' },
      { status: 400 }
    );
  }

  const preferencias = {
    ...(pilotos !== undefined ? { favoriteDrivers: pilotos } : {}),
    ...(equipos !== undefined ? { favoriteConstructors: equipos } : {}),
    ...(sesiones !== undefined ? { sessions: sesiones } : {}),
    ...(huso !== undefined ? { timezone: huso } : {}),
  };

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, ...preferencias },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        ...preferencias,
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
