import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { destinoDePushValido } from '@/lib/push-destino';
import { VAPID_PUBLICA } from '@/lib/push-claves';

/**
 * El envío de avisos push, del lado del servidor.
 *
 * ApexData no tiene cuentas, así que una suscripción **es** el destinatario: el
 * navegador da una dirección única y aquí se guarda con sus claves. Eso trae
 * una consecuencia que hay que atender o la lista se pudre: cuando alguien
 * desinstala la app o limpia el navegador, esa dirección deja de existir y el
 * servicio responde 404 o 410. Esas se borran solas al primer intento fallido;
 * si no, cada envío arrastraría para siempre a los que ya no están.
 */

export interface Aviso {
  titulo: string;
  cuerpo: string;
  /** A dónde lleva al tocarlo. */
  url: string;
  /** Agrupa avisos: uno nuevo del mismo tema sustituye al anterior. */
  etiqueta?: string;
}

let configurado = false;

/** Devuelve `false` si falta la clave privada, que es la única imprescindible. */
function configurar(): boolean {
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!privada) return false;
  if (configurado) return true;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'https://apexdata.meeks.fun',
    VAPID_PUBLICA,
    privada
  );
  configurado = true;

  return true;
}

export interface ResultadoEnvio {
  enviados: number;
  caducados: number;
  fallidos: number;
  /** A quienes no les tocaba este aviso. No es un fallo. */
  saltados: number;
}

/**
 * Manda el aviso a todas las suscripciones guardadas.
 *
 * En paralelo y sin cortar por un fallo: que un navegador rechace su aviso no
 * puede impedir que lleguen los demás.
 */
export async function avisarATodos(aviso: Aviso): Promise<ResultadoEnvio> {
  return avisarACadaUno(() => aviso);
}

/** Lo que hace falta de una suscripción para escribirle SU aviso. */
export interface DestinoDeAviso {
  id: string;
  endpoint: string;
  favoriteDrivers: string | null;
  favoriteConstructors: string | null;
  sessions: string | null;
}

/**
 * Manda a cada suscripción un aviso escrito para ella.
 *
 * ## Por qué no vale con `avisarATodos`
 *
 * Un aviso que dice «Antonelli 5.º, a 0.636 del más rápido» solo tiene sentido
 * para quien sigue a Antonelli. Con una sola carga para todos, o el aviso es
 * genérico o le habla a la persona equivocada, así que la carga tiene que
 * construirse por destinatario.
 *
 * `fabricar` puede devolver `null`, y eso es una respuesta legítima: significa
 * «a este no le interesa esta sesión». Se cuenta aparte de los fallos, porque
 * no avisar a quien apagó las prácticas es el comportamiento correcto y no
 * debería parecerse a un error en los registros.
 */
export async function avisarACadaUno(
  fabricar: (destino: DestinoDeAviso) => Aviso | null
): Promise<ResultadoEnvio> {
  if (!configurar()) {
    console.error('[push] Falta VAPID_PRIVATE_KEY: no se envía nada.');
    return { enviados: 0, caducados: 0, fallidos: 0, saltados: 0 };
  }

  const guardadas = await prisma.pushSubscription.findMany();

  // Se vuelve a comprobar el destino aquí, aunque `/api/push` ya lo valide.
  //
  // No es desconfianza de la ruta: es que las filas guardadas ANTES de que esa
  // validación existiera siguen en la tabla, y este bucle es el que de verdad
  // emite la petición. Una dirección inventada convertiría el aviso del domingo
  // en una petición nuestra contra la red interna del VPS, así que la
  // comprobación tiene que estar donde se dispara, no solo donde se guarda.
  const suscripciones = guardadas.filter((suscripcion) => {
    if (destinoDePushValido(suscripcion.endpoint)) return true;

    console.warn(
      `[push] Se salta una dirección que no es de un servicio conocido (id ${suscripcion.id}).`
    );
    return false;
  });

  const resultados = await Promise.all(
    suscripciones.map(async (suscripcion) => {
      const aviso = fabricar(suscripcion);
      if (!aviso) return 'saltado' as const;

      const carga = JSON.stringify(aviso);

      try {
        await webpush.sendNotification(
          {
            endpoint: suscripcion.endpoint,
            keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth },
          },
          carga
        );

        await prisma.pushSubscription.update({
          where: { id: suscripcion.id },
          data: { lastSentAt: new Date() },
        });

        return 'enviado' as const;
      } catch (error) {
        const codigo = (error as { statusCode?: number }).statusCode;

        // 404 y 410 significan «esta dirección ya no existe». No es un error
        // que reintentar: es una suscripción que hay que quitar de la lista.
        if (codigo === 404 || codigo === 410) {
          await prisma.pushSubscription.delete({ where: { id: suscripcion.id } });
          return 'caducado' as const;
        }

        console.error(`[push] Falló el envío (${codigo ?? 'sin código'}):`, error);
        return 'fallido' as const;
      }
    })
  );

  return {
    enviados: resultados.filter((r) => r === 'enviado').length,
    caducados: resultados.filter((r) => r === 'caducado').length,
    fallidos: resultados.filter((r) => r === 'fallido').length,
    saltados: resultados.filter((r) => r === 'saltado').length,
  };
}
