import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import {
  escribirLista,
  leerLista,
  limpiarAcento,
  limpiarLista,
  type Favoritos,
} from '@/lib/cuentas/favoritos';
import { prisma } from '@/lib/prisma';

/**
 * Los favoritos de quien ha entrado.
 *
 * Es la única puerta por la que los favoritos salen y entran de una cuenta. La
 * pantalla sigue guardándolos en el navegador como siempre —quien no entra no
 * nota nada— y esto solo existe para quien sí entró.
 *
 * No hay ruta para leer los de OTRA persona, y no la va a haber: la sesión
 * dice quién eres y de ahí no se sale. Por eso ninguna de las dos operaciones
 * recibe un identificador de usuario.
 */

/** Sin sesión no hay favoritos que dar, y tampoco es un error: es que no entraste. */
function sinSesion() {
  return NextResponse.json({ error: 'No has entrado.' }, { status: 401 });
}

export async function GET() {
  const sesion = await getServerSession(authOptions);
  const id = sesion?.user?.id;
  if (!id) return sinSesion();

  const persona = await prisma.user.findUnique({
    where: { id },
    select: { favoriteDrivers: true, favoriteConstructors: true, accentTeam: true },
  });

  if (!persona) return sinSesion();

  const favoritos: Favoritos = {
    pilotos: leerLista(persona.favoriteDrivers),
    equipos: leerLista(persona.favoriteConstructors),
    acento: persona.accentTeam ?? null,
  };

  // Sin caché en ningún sitio: esto es de una persona y cambia al tocarlo.
  return NextResponse.json(favoritos, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(peticion: Request) {
  const sesion = await getServerSession(authOptions);
  const id = sesion?.user?.id;
  if (!id) return sinSesion();

  const datos = (await peticion.json().catch(() => null)) as {
    pilotos?: unknown;
    equipos?: unknown;
    acento?: unknown;
  } | null;

  if (!datos) return NextResponse.json({ error: 'El cuerpo no es JSON.' }, { status: 400 });

  const pilotos = limpiarLista(datos.pilotos);
  const equipos = limpiarLista(datos.equipos);
  const acento = limpiarAcento(datos.acento);

  // Se rechaza entero y no a medias: guardar la mitad de lo que se pidió deja
  // al navegador y a la cuenta diciendo cosas distintas sin que nadie lo sepa.
  if (pilotos === null || equipos === null) {
    return NextResponse.json({ error: 'Los favoritos no tienen la forma esperada.' }, { status: 400 });
  }

  const guardada = await prisma.user.update({
    where: { id },
    data: {
      favoriteDrivers: escribirLista(pilotos),
      favoriteConstructors: escribirLista(equipos),
      // `undefined` no es «bórralo», es «no venía»: Prisma lo ignora y el
      // acento se queda como estaba. Confundirlos lo borraría cada vez que se
      // guarda cualquier otra cosa.
      ...(acento !== undefined ? { accentTeam: acento } : {}),
    },
    select: { favoriteDrivers: true, favoriteConstructors: true, accentTeam: true },
  });

  /**
   * Y de paso, los avisos de esta persona.
   *
   * Los favoritos ya viajaban al servidor con la suscripción para poder
   * redactar un aviso que hable de tu piloto. Si se actualizan aquí y allí no,
   * el aviso hablaría de los de antes. Se actualizan TODAS sus suscripciones:
   * el teléfono y el PC son dos, y las dos son suyas.
   */
  await prisma.pushSubscription.updateMany({
    where: { userId: id },
    data: {
      favoriteDrivers: guardada.favoriteDrivers,
      favoriteConstructors: guardada.favoriteConstructors,
    },
  });

  return NextResponse.json(
    {
      pilotos: leerLista(guardada.favoriteDrivers),
      equipos: leerLista(guardada.favoriteConstructors),
      acento: guardada.accentTeam ?? null,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
