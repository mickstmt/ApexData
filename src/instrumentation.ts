/**
 * La huella del despliegue en el registro del servidor.
 *
 * `/api/health` ya dice desde cuándo corre el proceso y con qué build, pero
 * hay que preguntárselo; el panel de EasyPanel enseña la consola, y ahí no
 * quedaba constancia de cuándo arrancó cada versión. Sin esta línea no hay
 * forma de mirar el registro y saber si un despliegue entró de verdad o se
 * está leyendo un contenedor de hace tres días — pasó, y costó una tarde.
 *
 * Next ejecuta `register()` una vez por arranque del servidor, que es
 * exactamente la definición de «hubo un despliegue o un reinicio».
 *
 * `node:fs` se importa DENTRO y no arriba del todo, y no es un capricho: desde
 * que existe `middleware.ts`, Next compila también una variante de este archivo
 * para el entorno *edge*, donde ese módulo no existe. Con el import arriba, el
 * módulo entero fallaba al evaluarse y **todas** las rutas de `/api/`
 * respondían 500 — incluida la de salud. Con el import aquí, la comprobación
 * de entorno corre antes y en edge no se llega a pedir nunca.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');

  let build = 'desconocido';
  for (const candidato of [
    join(process.cwd(), '.next', 'BUILD_ID'),
    join(process.cwd(), '.next', 'standalone', '.next', 'BUILD_ID'),
  ]) {
    try {
      build = readFileSync(candidato, 'utf8').trim();
      break;
    } catch {
      // El siguiente candidato; en desarrollo no existe ninguno y queda el
      // «desconocido», que también es información.
    }
  }

  const ahora = new Date();
  const lima = ahora.toLocaleString('es-PE', { timeZone: 'America/Lima', hour12: false });

  console.log(
    `[ApexData] Desplegado y arrancado: ${ahora.toISOString()} UTC (${lima} hora de Lima) · build ${build}`
  );

  arrancarAvisos();
}

/** Cada cuánto se pregunta si terminó alguna sesión. */
const CADA_MINUTOS = 5;

/** Cuánto se espera desde el arranque antes de la primera vuelta. */
const AL_ARRANCAR_SEGUNDOS = 45;

/**
 * El reloj de los avisos, dentro de la propia aplicación.
 *
 * ## Por qué aquí y no en GitHub Actions
 *
 * Porque el cron de GitHub no es un cron. El flujo de trabajo pide «cada hora»
 * y el domingo del GP de Italia se ejecutó a las 16:46, 18:51, 21:03 y 23:30
 * UTC: huecos de más de dos horas. GitHub estrangula los trabajos programados
 * de los repositorios gratuitos, y eso son dos horas que se suman a lo que ya
 * tarde la fuente.
 *
 * Con el reloj aquí, el retraso es nuestro y son cinco minutos. Junto con el
 * cambio de fuente —OpenF1 en lugar de Jolpica— el aviso pasa de llegar entre
 * seis y ocho horas tarde a llegar sobre media hora después de la bandera.
 *
 * ## Por qué es barato dejarlo cada cinco minutos
 *
 * Lo único que ocurre siempre es una consulta a OpenF1 preguntando por el
 * calendario de la temporada. Solo cuando alguna sesión ha terminado hace poco
 * —y no se ha avisado ya— se piden sus resultados. En una semana sin carrera no
 * pasa nada más.
 *
 * El flujo de trabajo de GitHub sigue existiendo como red por si el servidor
 * está caído justo el domingo; la marca por sesión impide que los dos avisen.
 */
function arrancarAvisos() {
  if (process.env.AVISOS_AUTOMATICOS === '0') {
    console.log('[avisos] Desactivados por AVISOS_AUTOMATICOS=0.');
    return;
  }

  // Sin la clave privada no se puede firmar nada, y despertar cada cinco
  // minutos para descubrirlo es ruido en el registro y peticiones a OpenF1 que
  // no llevan a ningún sitio.
  if (!process.env.VAPID_PRIVATE_KEY) {
    console.warn('[avisos] Falta VAPID_PRIVATE_KEY: el reloj de avisos no arranca.');
    return;
  }

  const vuelta = async () => {
    try {
      const { darUnaVuelta } = await import('@/lib/push/vuelta');
      const { resultados: informe, previas, fuentes } = await darUnaVuelta();

      for (const linea of fuentes.nuevas) {
        console.log(`[fuentes] ${linea}`);
      }

      for (const texto of previas.textos) {
        console.log(`[avisos] Previa enviada: ${texto}`);
      }

      for (const avisada of informe.avisadas) {
        console.log(
          `[avisos] ${avisada.sesion} — ${avisada.granPremio}: «${avisada.cuerpoGenerico}» · ` +
            `enviados ${avisada.enviados}, sin interés ${avisada.saltados}`
        );
      }

      for (const esperando of informe.esperando) {
        console.log(`[avisos] ${esperando}: terminada, aún sin datos en OpenF1.`);
      }
    } catch (error) {
      // Un fallo aquí no puede tumbar el servidor: esto corre suelto, sin nadie
      // esperando la respuesta, y la próxima vuelta lo vuelve a intentar.
      console.error('[avisos] La vuelta falló:', error);
    }
  };

  setTimeout(vuelta, AL_ARRANCAR_SEGUNDOS * 1000).unref?.();

  // `unref` para que este temporizador no sea motivo para que el proceso siga
  // vivo: si Node no tiene nada más que hacer, que se apague.
  setInterval(vuelta, CADA_MINUTOS * 60 * 1000).unref?.();

  console.log(`[avisos] Reloj en marcha: se comprueba cada ${CADA_MINUTOS} minutos.`);
}
