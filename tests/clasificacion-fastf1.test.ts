import { describe, expect, it } from 'vitest';
import { filasDeFastF1, segundosDeTiempo } from '@/lib/push/clasificacion-fastf1';
import datos from './fixtures/fastf1-espana-2026.json';

/**
 * Pasar los resultados de FastF1 a las filas que entiende la redacción.
 *
 * El material no es inventado: son las tres sesiones del GP de España 2026
 * pedidas al servicio de telemetría de verdad, recortadas a las columnas que se
 * usan. Por eso esta prueba vale — el riesgo de este cambio no era la lógica,
 * era suponer la forma de los datos.
 */

const CARRERA = datos.carrera as Record<string, unknown>[];
const CLASIFICACION = datos.clasificacion as Record<string, unknown>[];
const PRACTICA = datos.practica as Record<string, unknown>[];

describe('los tiempos', () => {
  it('lee las tres formas en que vienen', () => {
    expect(segundosDeTiempo('94:23.754')).toBeCloseTo(5663.754, 3); // el total del ganador
    expect(segundosDeTiempo('4.351')).toBeCloseTo(4.351, 3); // un hueco
    expect(segundosDeTiempo('1:26.746')).toBeCloseTo(86.746, 3); // un hueco largo
    expect(segundosDeTiempo('1:31.824')).toBeCloseTo(91.824, 3); // una vuelta
  });

  it('no se inventa nada con lo que no es un tiempo', () => {
    expect(segundosDeTiempo(null)).toBeNull();
    expect(segundosDeTiempo('')).toBeNull();
    expect(segundosDeTiempo('Retired')).toBeNull();
    expect(segundosDeTiempo('+1 Lap')).toBeNull();
  });
});

describe('la carrera', () => {
  const filas = filasDeFastF1(CARRERA, true)!;

  it('sale en orden y con el ganador delante', () => {
    expect(filas).not.toBeNull();
    expect(filas).toHaveLength(22);
    expect(filas[0].codigo).toBe('ANT');
    expect(filas[0].nombre).toBe('Kimi Antonelli');
    expect(filas[0].equipo).toBe('Mercedes');
    expect(filas[0].puesto).toBe(1);
    expect(filas[0].puntos).toBe(25);
  });

  it('el tiempo del ganador es el total, y el del segundo el total más su hueco', () => {
    // Lo que dice FastF1: el primero trae «94:23.754» y el segundo «4.351»,
    // que es el hueco. Sin sumar, la redacción diría que el segundo hizo la
    // carrera en cuatro segundos.
    expect(filas[0].tiempo).toBeCloseTo(5663.754, 2);
    expect(filas[1].codigo).toBe('VER');
    expect(filas[1].tiempo).toBeCloseTo(5663.754 + 4.351, 2);
    expect(filas[1].tiempo! - filas[0].tiempo!).toBeCloseTo(4.351, 3);
  });

  it('a un doblado no se le inventa un tiempo', () => {
    // Su hueco es en SU vuelta, no con el ganador: sumarlo daría un número que
    // no existe. La redacción sabe callarse cuando esto es nulo.
    const doblado = filas.find((f) => f.codigo === 'LIN')!;
    expect(doblado.puesto).toBe(9);
    expect(doblado.abandono).toBe(false);
    expect(doblado.tiempo).toBeNull();
  });

  it('los retirados salen como abandono y sin puesto', () => {
    const fuera = filas.filter((f) => f.abandono).map((f) => f.codigo);
    expect(fuera).toEqual(['SAI', 'PER', 'STR', 'HAM']);
    for (const codigo of fuera) {
      const fila = filas.find((f) => f.codigo === codigo)!;
      expect(fila.puesto, `${codigo} no debería tener puesto`).toBeNull();
      expect(fila.tiempo).toBeNull();
    }
  });

  it('trae el color del equipo con almohadilla, como lo espera la app', () => {
    expect(filas[0].color).toBe('#00D7B6');
  });
});

describe('cómo acabó cada uno', () => {
  it('distingue retirado, descalificado y quien ni salió', () => {
    // FastF1 lo pone en `ClassifiedPosition`, que es texto: R retirado, D
    // descalificado, W quien no tomó la salida. Se mira esa y no `Status`, que
    // lleva la causa —«Accident», «Engine»— y no un juego cerrado.
    const tocadas = CARRERA.map((f) => {
      if (f.Abbreviation === 'SAI') return { ...f, ClassifiedPosition: 'D', Status: 'Disqualified' };
      if (f.Abbreviation === 'PER') return { ...f, ClassifiedPosition: 'W', Status: 'Withdrew' };
      return f;
    });

    const filas = filasDeFastF1(tocadas, true)!;
    const sai = filas.find((f) => f.codigo === 'SAI')!;
    const per = filas.find((f) => f.codigo === 'PER')!;
    const str = filas.find((f) => f.codigo === 'STR')!;

    expect([sai.descalificado, sai.noSalio, sai.abandono]).toEqual([true, false, false]);
    expect([per.descalificado, per.noSalio, per.abandono]).toEqual([false, true, false]);
    expect([str.descalificado, str.noSalio, str.abandono]).toEqual([false, false, true]);
  });

  it('a un doblado no se le da por retirado: sí terminó', () => {
    const filas = filasDeFastF1(CARRERA, true)!;
    const doblado = filas.find((f) => f.codigo === 'GAS')!;
    expect([doblado.abandono, doblado.noSalio, doblado.descalificado]).toEqual([false, false, false]);
    expect(doblado.puesto).toBe(12);
  });
});

describe('la clasificación', () => {
  const filas = filasDeFastF1(CLASIFICACION, false)!;

  it('el tiempo es el del último tramo al que llegó cada uno', () => {
    expect(filas[0].codigo).toBe('NOR');
    expect(filas[0].tiempo).toBeCloseTo(91.824, 3); // su Q3
    expect(filas[1].codigo).toBe('ANT');
    expect(filas[1].tiempo).toBeCloseTo(91.835, 3);
  });

  it('en una clasificación no hay puntos', () => {
    expect(filas[0].puntos).toBeNull();
  });
});

describe('cuándo NO sirve, que es lo que evita un aviso equivocado', () => {
  it('una práctica no trae clasificación: FastF1 da las filas vacías', () => {
    // Comprobado contra el servicio con la FP1 de España: las 22 filas están,
    // pero `Position` viene a nulo y no hay tiempos. El experimento de la
    // carrera de fuentes contaba filas, no resultados, así que su medida de
    // las prácticas decía «la sesión ya carga», no «ya hay clasificación».
    expect(filasDeFastF1(PRACTICA, false)).toBeNull();
  });

  it('sin nada, o a medio publicar, tampoco', () => {
    expect(filasDeFastF1([], true)).toBeNull();
    expect(filasDeFastF1(null, true)).toBeNull();

    // Solo un tercio con puesto: o es una practica o esta a medias.
    const aMedias = CARRERA.map((f, i) => (i < 8 ? f : { ...f, Position: null }));
    expect(filasDeFastF1(aMedias, true)).toBeNull();
  });

  it('sin códigos de piloto tampoco, porque no hay aviso que redactar', () => {
    const sinCodigo = CARRERA.map((f) => ({ ...f, Abbreviation: '' }));
    expect(filasDeFastF1(sinCodigo, true)).toBeNull();
  });
});
