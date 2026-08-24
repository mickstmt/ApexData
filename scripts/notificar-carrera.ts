/**
 * Avisa del resultado de la última carrera, si no se ha avisado ya.
 *
 * Lo llama el cron semanal después de sembrar, que es cuando los resultados
 * acaban de entrar en la base. Su trabajo es decidir **si hay algo que contar**:
 * la mayoría de los lunes no habrá carrera nueva y no debe pasar nada.
 *
 * La marca `notifiedAt` es lo que lo hace seguro de repetir: se puede ejecutar
 * a mano, dos veces seguidas o después de un fallo a medias, y nadie recibe el
 * mismo aviso dos veces.
 *
 * Uso:
 *   npx tsx scripts/notificar-carrera.ts            (avisa si toca)
 *   npx tsx scripts/notificar-carrera.ts --probar   (solo dice qué haría)
 */

import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { avisarATodos } from '../src/lib/push';

async function main() {
  const soloProbar = process.argv.includes('--probar');

  /**
   * Solo se avisa de lo que acaba de pasar.
   *
   * Sin esta ventana el aviso se convierte en un desastre silencioso: las 400
   * carreras de la base están sin avisar, así que la primera ejecución contaría
   * la última, la siguiente la anterior, y semana a semana iría enviando
   * resultados de 2010 como si fueran de ayer. Lo destapó el ensayo antes de
   * mandar nada.
   *
   * Ocho días, no siete: el cron corre los lunes y una carrera del domingo
   * anterior tiene que caber aunque el reloj vaya justo.
   */
  const DIAS = 8;
  const desde = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000);

  const carrera = await prisma.race.findFirst({
    where: {
      notifiedAt: null,
      // Solo carreras ya corridas y con resultados: un calendario publicado no
      // es una carrera terminada.
      date: { gte: desde, lte: new Date() },
      results: { some: {} },
    },
    orderBy: [{ year: 'desc' }, { round: 'desc' }],
    select: {
      id: true,
      year: true,
      round: true,
      raceName: true,
      circuit: { select: { name: true, country: true } },
      results: {
        where: { position: 1 },
        select: {
          driver: { select: { givenName: true, familyName: true } },
          team: { select: { name: true } },
        },
      },
    },
  });

  if (!carrera) {
    console.log(`No hay ninguna carrera de los últimos ${DIAS} días pendiente de avisar.`);
    return;
  }

  const ganador = carrera.results[0];

  if (!ganador) {
    console.log(`${carrera.raceName} ${carrera.year} no tiene ganador guardado; no se avisa.`);
    return;
  }

  const aviso = {
    titulo: `${carrera.raceName} ${carrera.year}`,
    cuerpo: `Ganó ${ganador.driver.givenName} ${ganador.driver.familyName} (${ganador.team.name}).`,
    url: `/results/${carrera.year}/${carrera.round}`,
    // Una etiqueta por carrera: si por lo que sea salieran dos avisos de la
    // misma, el segundo sustituye al primero en vez de apilarse.
    etiqueta: `carrera-${carrera.year}-${carrera.round}`,
  };

  const suscritos = await prisma.pushSubscription.count();
  console.log(`Carrera: ${aviso.titulo}`);
  console.log(`Aviso:   ${aviso.cuerpo}`);
  console.log(`Destino: ${aviso.url} | suscripciones: ${suscritos}`);

  if (soloProbar) {
    console.log('\n--probar: no se envía nada y la carrera queda sin marcar.');
    return;
  }

  const resultado = await avisarATodos(aviso);
  console.log(
    `Enviados: ${resultado.enviados} | caducados y borrados: ${resultado.caducados} | fallidos: ${resultado.fallidos}`
  );

  /**
   * Cero suscripciones no es un exito silencioso.
   *
   * Tal como estaba, mandar a nadie y marcar la carrera como avisada se leia
   * exactamente igual que un envio correcto: en verde y sin una palabra. Paso
   * con el GP de Paises Bajos del 2026-08-23 —la carrera quedo marcada a las
   * 17:22 UTC y no habia ni una suscripcion guardada—, y desde fuera parecia
   * que los avisos funcionaban.
   *
   * El `::warning::` sale en el resumen de la ejecucion y se puede leer por API
   * sin credenciales, asi que la proxima vez se ve sin entrar a mirar.
   */
  if (suscritos === 0) {
    console.warn('::warning::No hay ninguna suscripcion guardada: el aviso no ha llegado a nadie.');
    console.warn(
      '::warning::Se activan desde /favorites, con la app instalada en la pantalla de inicio.'
    );
  } else if (resultado.enviados === 0) {
    console.warn(
      `::warning::Habia ${suscritos} suscripciones y no se entrego ninguna (${resultado.fallidos} fallidas, ${resultado.caducados} caducadas).`
    );
  }

  // Se marca aunque no hubiera nadie suscrito: la carrera ya está contada, y
  // dejarla sin marcar haría que el aviso saliera la semana siguiente, cuando
  // ya no es noticia.
  await prisma.race.update({ where: { id: carrera.id }, data: { notifiedAt: new Date() } });
  console.log('Carrera marcada como avisada.');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
