import { describe, expect, it } from 'vitest';

import { cabecerasDeCronometria, tieneDatos } from '@/lib/cronometria-cache';

/**
 * Lo que impide que una respuesta provisional se quede un día en el teléfono.
 *
 * El 2026-09-15 se cachearon las cuatro rutas de cronometría a 24 horas para
 * arreglar una queja real —«siempre en las prácticas libres pide la data cada
 * vez que entramos»— y se coló un fallo peor: **una respuesta de 200 puede ser
 * provisional**. Entre que acaba una sesión y que FastF1 publica sus vueltas
 * pasan ~30 minutos, medidos en Bakú, y ahí la respuesta es un 200 con la lista
 * vacía.
 *
 * El 2026-09-24 el usuario lo vio: los avisos de las prácticas de Bakú llegaban
 * con sus resultados y la pantalla seguía diciendo que no había información.
 * Comprobado con `curl` a la misma hora: la API devolvía 22 vueltas. Quien no
 * las tenía era su navegador, con el vacío congelado.
 */
describe('la caché de cronometría', () => {
  it('un vacío no se guarda: es «todavía no», no una respuesta', () => {
    expect(cabecerasDeCronometria(false)['Cache-Control']).toBe('no-store');
  });

  it('con datos se guarda, pero revalidando', () => {
    const valor = cabecerasDeCronometria(true)['Cache-Control'];

    // La segunda visita sigue siendo instantánea, que es lo que se pedía…
    expect(valor).toContain('max-age=300');
    // …y una respuesta incompleta se cura sola en minutos, no en un día.
    expect(valor).toContain('stale-while-revalidate');
  });

  describe('qué cuenta como tener datos', () => {
    it('una lista con algo', () => {
      expect(tieneDatos({ fastest_laps: [{ Driver: 'VER' }] }, 'fastest_laps')).toBe(true);
    });

    it('una lista vacía, no', () => {
      expect(tieneDatos({ fastest_laps: [] }, 'fastest_laps')).toBe(false);
    });

    it('el campo que no existe, tampoco', () => {
      expect(tieneDatos({ session: { year: 2026 } }, 'fastest_laps')).toBe(false);
    });

    it('con varios campos basta uno', () => {
      // `/stints` reparte su contenido en dos listas según la versión del
      // servicio; mirar solo una daría «vacío» con datos delante.
      expect(tieneDatos({ stints: [], drivers: ['VER'] }, 'stints', 'drivers')).toBe(true);
    });

    it('lo que no es objeto no tiene datos', () => {
      expect(tieneDatos(null, 'laps')).toBe(false);
      expect(tieneDatos('vacío', 'laps')).toBe(false);
    });
  });
});
