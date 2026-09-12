/**
 * Avisa de las sesiones que acaban de terminar.
 *
 * El disparador de verdad vive dentro de la aplicación (`src/instrumentation.ts`)
 * y corre cada pocos minutos. Este guion es la misma llamada a mano, y existe
 * por dos motivos:
 *
 * 1. **Para probarlo sin esperar a un fin de semana.** Con `--probar` mira,
 *    dice qué haría y no envía ni marca nada.
 * 2. **Como red.** Si el servidor estuvo caído el domingo, esto lo recupera
 *    desde cualquier sitio con acceso a la base.
 *
 * Uso:
 *   npx tsx scripts/avisar-sesiones.ts            (avisa si toca)
 *   npx tsx scripts/avisar-sesiones.ts --probar   (solo dice qué haría)
 */

import 'dotenv/config';

import { darUnaVuelta } from '../src/lib/push/vuelta';
import { OpenF1NoDisponibleError } from '../src/services/openf1/client';
import { prisma } from '../src/lib/prisma';

async function main() {
  const ensayo = process.argv.includes('--probar');

  const suscritos = await prisma.pushSubscription.count();

  /**
   * Que OpenF1 no conteste no es un fallo de esta ejecución.
   *
   * El calendario sale solo de ahí, así que sin él no hay nada que mirar: ni
   * resultados, ni previas, ni sondeo. Antes eso salía por la puerta de los
   * errores y tumbaba la vuelta con un correo de «Run failed», y la persona
   * que lo recibe no puede hacer nada — el problema está en el otro extremo.
   *
   * No se pierde ningún aviso por salir así: una sesión solo se marca como
   * avisada **cuando el envío sale**, y `estaEnPunto` sigue mirando cuarenta y
   * ocho horas hacia atrás. La vuelta siguiente recoge lo que esta no pudo.
   * Lo que cuesta es retraso, y eso se dice en el resumen para que se vea.
   */
  let vuelta;
  try {
    vuelta = await darUnaVuelta({ ensayo });
  } catch (error) {
    if (!(error instanceof OpenF1NoDisponibleError)) throw error;

    console.warn(`::warning::OpenF1 no contesto: ${error.message}`);
    console.warn(
      '::warning::Esta vuelta no mira nada. No se pierde ningun aviso: la siguiente lo recoge, ' +
        'y la ventana de resultados es de 48 h. Si se repite muchas vueltas seguidas, mirar OpenF1.'
    );
    return;
  }

  const { resultados: informe, previas } = vuelta;

  if (previas.sinZona) {
    console.log(`· ${previas.sinZona} suscripciones sin huso horario: se quedan sin previa.`);
  }

  for (const texto of previas.textos) {
    console.log(`Previa: ${texto}`);
  }

  if (informe.tranquilo && !previas.textos.length) {
    console.log('Ni sesiones recién terminadas ni previas que mandar. Nada que hacer.');
    return;
  }

  for (const esperando of informe.esperando) {
    console.log(`· ${esperando}: terminada, pero OpenF1 aún no publica su clasificación.`);
  }

  if (!informe.avisadas.length) {
    console.log('Nada nuevo que avisar.');
    return;
  }

  for (const avisada of informe.avisadas) {
    console.log(`\n${avisada.sesion} — ${avisada.granPremio}`);
    console.log(`  Aviso: ${avisada.cuerpoGenerico}`);
    console.log(`  Enviados: ${avisada.enviados} | sin interés: ${avisada.saltados}`);
  }

  if (ensayo) {
    console.log('\n--probar: no se ha enviado nada y las sesiones quedan sin marcar.');
    return;
  }

  /**
   * Cero suscripciones no es un éxito silencioso.
   *
   * Ya pasó una vez: el GP de Países Bajos se marcó como avisado sin que
   * hubiera ni una suscripción guardada, y desde fuera todo se veía en verde.
   * El `::warning::` sale en el resumen de la ejecución de GitHub y se puede
   * leer por API sin credenciales.
   */
  if (suscritos === 0) {
    console.warn('::warning::No hay ninguna suscripcion guardada: el aviso no llego a nadie.');
    console.warn('::warning::Se activan desde /favorites, con la app instalada en la pantalla de inicio.');
  }
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
