import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * El identificador único de esta compilación.
 *
 * Next escribe uno por cada build de producción en `.next/BUILD_ID`. Sirve para
 * convertir «¿está mi código en producción?» en una comparación de cadenas en
 * vez de una deducción a partir del tiempo encendido: un contenedor se puede
 * reiniciar por motivos que no tienen nada que ver con un despliegue.
 *
 * Se lee una vez al cargar el módulo porque no puede cambiar mientras el
 * proceso viva. Los dos candidatos son la salida normal y la de `standalone`,
 * que es la que produce el Dockerfile.
 *
 * En desarrollo no existe el archivo y queda `desconocido`, que también es
 * información: significa que no se está mirando una compilación.
 */
export const BUILD_ID: string = (() => {
  for (const candidato of [
    join(process.cwd(), '.next', 'BUILD_ID'),
    join(process.cwd(), '.next', 'standalone', '.next', 'BUILD_ID'),
  ]) {
    try {
      return readFileSync(candidato, 'utf8').trim();
    } catch {
      // El siguiente candidato.
    }
  }

  return 'desconocido';
})();
