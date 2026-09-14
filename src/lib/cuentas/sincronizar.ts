import { decidirFusion, iguales, juntar, type Favoritos } from '@/lib/cuentas/favoritos';

/**
 * Los favoritos del aparato y los de la cuenta, puestos de acuerdo.
 *
 * ## Por qué está aquí y no dentro del contexto
 *
 * Porque es la parte que se puede probar sin navegador. Lo que vive en el
 * contexto es «pedir, guardar y volver a pintar»; lo que decide **qué queda**
 * es esto, y es lo único que puede perder datos de alguien.
 *
 * ## Qué hace, caso por caso
 *
 * - La cuenta vacía y el aparato con cosas → **suben**. Es la primera vez que
 *   se entra desde aquí.
 * - El aparato vacío y la cuenta con cosas → **bajan**. Es un aparato nuevo.
 * - Los dos dicen lo mismo → nada, y ni siquiera se escribe.
 * - Los dos con cosas distintas → se **juntan** y el resultado sube. Ver
 *   `juntar`: es la única salida que no borra nada de nadie.
 */
export interface Sincronizacion {
  /** Lo que tiene que quedar a la vista y en el navegador. */
  resultado: Favoritos;
  /** Si hay que escribirlo en la cuenta. Falso cuando ya coincidían. */
  hayQueSubir: boolean;
}

export function sincronizar(aparato: Favoritos, cuenta: Favoritos): Sincronizacion {
  switch (decidirFusion(aparato, cuenta)) {
    case 'nada':
      return { resultado: aparato, hayQueSubir: false };

    case 'subir':
      return { resultado: aparato, hayQueSubir: true };

    case 'bajar':
      return { resultado: cuenta, hayQueSubir: false };

    case 'preguntar': {
      const juntos = juntar(aparato, cuenta);
      // Si al juntarlos sale exactamente lo que ya tenía la cuenta, no hay nada
      // que escribir: pasa cuando el aparato es un subconjunto de la cuenta.
      return { resultado: juntos, hayQueSubir: !iguales(juntos, cuenta) };
    }
  }
}
