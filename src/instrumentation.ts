import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
 */
export function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== 'nodejs') return;

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
}
