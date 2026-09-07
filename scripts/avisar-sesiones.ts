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

import { avisarDeSesionesTerminadas } from '../src/lib/push/avisos-de-sesion';
import { prisma } from '../src/lib/prisma';

async function main() {
  const ensayo = process.argv.includes('--probar');

  const suscritos = await prisma.pushSubscription.count();
  const informe = await avisarDeSesionesTerminadas({ ensayo });

  if (informe.tranquilo) {
    console.log('No ha terminado ninguna sesión hace poco. Nada que hacer.');
    return;
  }

  if (informe.estrenado) {
    console.log(
      `Estreno: ${informe.estrenado} sesiones recientes quedan anotadas sin avisar, ` +
        'para no repetir lo que ya salió por el sistema anterior.'
    );
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
