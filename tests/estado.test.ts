import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { SONDAS, construirEstado } from '../scripts/estado';

/**
 * La prueba que impide que el estado del proyecto se quede viejo.
 *
 * ## Por qué hace falta una prueba y no un aviso
 *
 * Porque los avisos no impiden nada, y está comprobado. En dos días, tres
 * sesiones leyeron un documento desactualizado y le dijeron al usuario que
 * estaba pendiente algo ya hecho. Se escribieron avisos en los tres documentos
 * y **la cuarta vez volvió a pasar**: se le pidió pulsar Deploy a mano en un
 * servicio que se despliega solo desde el 2026-08-24. Su respuesta: «cómo me
 * vas a decir que no se despliega solo si tú mismo me hiciste los pasos».
 *
 * Un párrafo no falla. Esto sí: si alguien cambia el código y no regenera
 * `ESTADO.md`, el CI se pone en rojo y nadie puede seguir sin mirarlo.
 */
const RAIZ = join(__dirname, '..');

describe('ESTADO.md no puede quedarse viejo', () => {
  it('coincide con lo que dice el código ahora mismo', () => {
    const enDisco = readFileSync(join(RAIZ, 'ESTADO.md'), 'utf8');
    const recienLeido = construirEstado(RAIZ);

    expect(
      enDisco,
      'ESTADO.md no cuadra con el código. Ejecuta `npm run estado` y commitea el resultado.'
    ).toBe(recienLeido);
  });

  it('cada sonda mira un fichero de verdad, no una frase', () => {
    // Una sonda que no lea nada devolvería siempre lo mismo y daría una
    // seguridad falsa, que es peor que no tenerla.
    for (const sonda of SONDAS) {
      expect(sonda.evidencia, `«${sonda.pregunta}» no dice dónde comprobarse`).toMatch(/`.+`/);
      expect(typeof sonda.resuelta(RAIZ), `«${sonda.pregunta}» no contesta`).toBe('boolean');
    }
  });

  /**
   * Lo que el usuario tiene que decidir sale ARRIBA, no enterrado.
   *
   * Lo pidió él: «¿por qué no dejas escrita la evidencia para que, si le pido
   * continuar con lo pendiente, lo primero que me diga sea lo de la CSP?».
   * Estaba escrito —en una fila entre siete y en la sección 3 del traspaso— y
   * aun así había que acordarse de sacarlo.
   */
  it('las decisiones del usuario van antes que la tabla', () => {
    const estado = construirEstado(RAIZ);
    const pendientesConDecision = SONDAS.filter((s) => s.decision && !s.resuelta(RAIZ));

    if (pendientesConDecision.length === 0) {
      expect(estado).not.toContain('Antes de proponer trabajo');
      return;
    }

    const avisoEn = estado.indexOf('Antes de proponer trabajo');
    const tablaEn = estado.indexOf('| Qué | Cómo está |');

    expect(avisoEn, 'el aviso de decisiones no aparece').toBeGreaterThan(-1);
    expect(avisoEn, 'el aviso va DESPUÉS de la tabla: se lee tarde').toBeLessThan(tablaEn);

    for (const sonda of pendientesConDecision) {
      expect(estado, `falta la decisión de «${sonda.pregunta}»`).toContain(sonda.decision!);
    }
  });

  /**
   * El caso concreto que costó la bronca del 2026-09-15.
   *
   * Si el CI tiene el paso que despliega el servicio, **ninguna sesión puede
   * volver a pedir un Deploy a mano**. Se comprueba aquí y no en un documento
   * porque el documento ya lo decía mal durante tres semanas.
   */
  it('si el CI despliega el servicio, el estado lo dice', () => {
    const ci = readFileSync(join(RAIZ, '.github/workflows/ci.yml'), 'utf8');
    const automatico = ci.includes('Desplegar el servicio de telemetría');

    const estado = construirEstado(RAIZ);
    const linea = estado
      .split('\n')
      .find((l) => l.includes('¿se despliega solo?'));

    expect(linea, 'la sonda del despliegue del servicio ha desaparecido').toBeTruthy();
    expect(linea).toContain(automatico ? 'SÍ, desde el 2026-08-24' : 'NO — hay que pulsar Deploy');
  });
});
