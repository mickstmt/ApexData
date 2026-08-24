import { describe, expect, it } from 'vitest';
import {
  SegmentoInvalidoError,
  anioValido,
  numeroAcotado,
  segmentoAnio,
  segmentoEvento,
  segmentoPiloto,
} from '@/services/fastf1/segmentos';

/**
 * La web hace de proxy hacia un servicio que no tiene dominio: vive en la red
 * interna del VPS. Ese aislamiento se anulaba desde aquí, porque los segmentos
 * se metían en la URL tal cual y Next decodifica `%2F`, `%3F` y `%23` dentro de
 * un segmento dinámico. Comprobado en producción el 2026-08-24:
 *
 *     GET /api/laps/2100/..%2F..%2F..%2Fhealth%23/R
 *     → {"status":"healthy","cache_enabled":true,…}   ← el SERVICIO, no la web
 *
 * Estas pruebas son la puerta cerrada.
 */

describe('el Gran Premio que sale hacia el servicio', () => {
  it('deja pasar los nombres de verdad', () => {
    for (const nombre of ['Monza', 'Dutch Grand Prix', 'São Paulo', '12', "Villeneuve's"]) {
      expect(() => segmentoEvento(nombre)).not.toThrow();
    }
  });

  it('no deja subir por la ruta', () => {
    // El ataque exacto que funcionaba en producción.
    expect(() => segmentoEvento('../../../health')).toThrow(SegmentoInvalidoError);
    expect(() => segmentoEvento('..%2F..%2Fhealth')).toThrow(SegmentoInvalidoError);
  });

  it('no deja abrir una query ni cortar la ruta', () => {
    // `?` colaba parámetros en la petición interna; `#` truncaba el resto de la
    // plantilla y dejaba elegir la ruta final.
    expect(() => segmentoEvento('Monza?x=1')).toThrow(SegmentoInvalidoError);
    expect(() => segmentoEvento('Monza#')).toThrow(SegmentoInvalidoError);
    expect(() => segmentoEvento('Monza&y=2')).toThrow(SegmentoInvalidoError);
  });

  it('no deja una barra, ni suelta ni escapada', () => {
    expect(() => segmentoEvento('a/b')).toThrow(SegmentoInvalidoError);
    expect(() => segmentoEvento('a\b')).toThrow(SegmentoInvalidoError);
  });

  it('rechaza lo vacío y lo desmesurado', () => {
    expect(() => segmentoEvento('')).toThrow(SegmentoInvalidoError);
    expect(() => segmentoEvento('M'.repeat(61))).toThrow(SegmentoInvalidoError);
  });

  it('codifica lo que deja pasar', () => {
    // Un espacio válido no puede viajar crudo dentro de una URL.
    expect(segmentoEvento('Dutch Grand Prix')).toBe('Dutch%20Grand%20Prix');
  });
});

describe('el piloto', () => {
  it('acepta el código y el número de coche', () => {
    for (const piloto of ['VER', 'NOR', 'ALO', '1', '44']) {
      expect(() => segmentoPiloto(piloto)).not.toThrow();
    }
  });

  it('no deja inyectar otro parámetro', () => {
    // Iba a `?driver=…` sin codificar: un `&` añadía parámetros a la petición.
    expect(() => segmentoPiloto('VER&x=1')).toThrow(SegmentoInvalidoError);
    expect(() => segmentoPiloto('../health')).toThrow(SegmentoInvalidoError);
  });
});

describe('el año', () => {
  it('acepta las temporadas con cronometría', () => {
    expect(anioValido(2018)).toBe(true);
    expect(anioValido(2026)).toBe(true);
  });

  it('rechaza lo anterior a FastF1 y lo que no ha pasado', () => {
    // 3000 costaba 3,5 s de servicio y no se cacheaba: repetirlo salía gratis
    // al atacante y caro a nosotros.
    expect(anioValido(2017)).toBe(false);
    expect(anioValido(1950)).toBe(false);
    expect(anioValido(3000)).toBe(false);
    expect(() => segmentoAnio(3000)).toThrow(SegmentoInvalidoError);
  });

  it('rechaza lo que ni siquiera es un número', () => {
    expect(anioValido(NaN)).toBe(false);
    expect(anioValido(2024.5)).toBe(false);
  });
});

describe('los números que van a la URL', () => {
  it('recorta por arriba y por abajo', () => {
    expect(numeroAcotado(999_999, 1, 100)).toBe(100);
    expect(numeroAcotado(-5, 1, 100)).toBe(1);
    expect(numeroAcotado(20, 1, 100)).toBe(20);
  });

  it('un negativo no puede cambiar el significado en silencio', () => {
    // `.head(-5)` de pandas descarta los cinco últimos en vez de tomar los
    // cinco primeros: sin suelo, `limit=-5` cambiaba la respuesta sin avisar.
    expect(numeroAcotado(-5, 1, 100)).toBeGreaterThan(0);
  });

  it('lo que no es número cae al mínimo', () => {
    expect(numeroAcotado(NaN, 1, 100)).toBe(1);
    expect(numeroAcotado(Infinity, 1, 100)).toBe(1);
  });
});
