import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COUNTRY_TO_ISO, NATIONALITY_TO_ISO } from '@/lib/countries';

/**
 * `CountryFlag` solo se protege de que falte el **mapeo**, no de que falte el
 * **archivo**: con un ISO mapeado y sin SVG, `next/image` devuelve un 400 y en
 * pantalla queda una imagen rota.
 *
 * Pasó de verdad. `scripts/images/flags.ts` deriva los códigos de la base, así
 * que basta con que entre un piloto de un país nuevo y nadie vuelva a
 * ejecutarlo: Sochi y Corea llevaban meses con la bandera rota en el calendario
 * y en la ficha de circuito, y con ellos cuatro pilotos rusos, un polaco, un
 * venezolano y un indonesio.
 *
 * Esta prueba convierte el mapa en una promesa comprobable: si está en la
 * tabla, el archivo existe. Cuesta ~600 B por bandera.
 */
describe('banderas', () => {
  const disponibles = new Set(
    readdirSync(join(process.cwd(), 'public/images/flags'))
      .filter((archivo) => archivo.endsWith('.svg'))
      .map((archivo) => archivo.replace('.svg', ''))
  );

  const mapeadas = [
    ...new Set([...Object.values(NATIONALITY_TO_ISO), ...Object.values(COUNTRY_TO_ISO)]),
  ].sort();

  it('todo código mapeado tiene su archivo', () => {
    const sinArchivo = mapeadas.filter((iso) => !disponibles.has(iso));

    expect(
      sinArchivo,
      `Mapeados sin SVG en public/images/flags: ${sinArchivo.join(', ')}. ` +
        'Ejecuta `npx tsx scripts/images/flags.ts` o baja el archivo a mano.'
    ).toEqual([]);
  });

  it('hay banderas mapeadas', () => {
    // Un mapa vacío haría pasar la prueba anterior sin comprobar nada.
    expect(mapeadas.length).toBeGreaterThan(30);
  });
});
