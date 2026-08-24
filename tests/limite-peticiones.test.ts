import { describe, expect, it } from 'vitest';
import {
  Limitador,
  PRESUPUESTOS,
  presupuestoDe,
  quienPide,
} from '@/lib/limite-peticiones';

/**
 * Casi todo lo que encontró la auditoría era explotable porque nada impedía
 * repetirlo. Esto es lo que lo impide, así que conviene que esté probado.
 */

const AHORA = 1_700_000_000_000;
const suelto = { peticiones: 60, ventanaMs: 60_000, rafaga: 10 };

describe('a qué ruta le toca qué', () => {
  it('la telemetría es lo más caro y lo más restringido', () => {
    // Cada fallo de caché descarga una sesión entera y bloquea el servicio.
    for (const ruta of [
      '/api/laps/2024/Monza/R',
      '/api/telemetry/2024/Monza/R/VER',
      '/api/clasificacion/2026/12/SQ',
      '/api/weather/2024/Monza/R',
    ]) {
      expect(presupuestoDe(ruta)?.presupuesto, ruta).toBe(PRESUPUESTOS.telemetria);
    }
  });

  it('escribir en la base es lo más restringido de todo', () => {
    // Un teléfono se suscribe una vez; cada dirección distinta crea una fila.
    expect(presupuestoDe('/api/push')?.presupuesto).toBe(PRESUPUESTOS.escritura);
  });

  it('el resto de la API va al presupuesto general', () => {
    expect(presupuestoDe('/api/drivers')?.presupuesto).toBe(PRESUPUESTOS.api);
  });

  it('la comprobación de salud no se limita', () => {
    // La sondean el CI y EasyPanel sin parar: limitarla sería limitarnos.
    expect(presupuestoDe('/api/health')).toBeNull();
  });

  it('las páginas no se limitan', () => {
    expect(presupuestoDe('/')).toBeNull();
    expect(presupuestoDe('/results/2024/1')).toBeNull();
  });
});

describe('de quién viene la petición', () => {
  it('prefiere la que escribe el proxy', () => {
    const h = new Headers({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': 'mentira' });
    expect(quienPide(h)).toBe('203.0.113.7');
  });

  it('toma la ÚLTIMA de x-forwarded-for, no la primera', () => {
    // La primera la controla quien envía la petición: bastaría con mandar una
    // inventada distinta cada vez para estrenar cubo en cada intento. La última
    // la escribe nuestro propio proxy.
    const h = new Headers({ 'x-forwarded-for': '1.1.1.1, 203.0.113.7' });
    expect(quienPide(h)).toBe('203.0.113.7');
  });

  it('sin cabeceras, todos comparten cubo', () => {
    expect(quienPide(new Headers())).toBe('sin-identificar');
  });
});

describe('el cubo de fichas', () => {
  it('deja pasar la ráfaga y corta la siguiente', () => {
    const limitador = new Limitador();

    for (let i = 0; i < suelto.rafaga; i++) {
      expect(limitador.consultar('a', suelto, AHORA).permitida, `petición ${i + 1}`).toBe(true);
    }

    expect(limitador.consultar('a', suelto, AHORA).permitida).toBe(false);
  });

  it('dice cuánto hay que esperar, y es un número usable', () => {
    const limitador = new Limitador();
    for (let i = 0; i < suelto.rafaga; i++) limitador.consultar('a', suelto, AHORA);

    const { esperarSegundos } = limitador.consultar('a', suelto, AHORA);
    expect(esperarSegundos).toBeGreaterThan(0);
    expect(esperarSegundos).toBeLessThanOrEqual(60);
  });

  it('se rellena solo con el tiempo', () => {
    const limitador = new Limitador();
    for (let i = 0; i < suelto.rafaga; i++) limitador.consultar('a', suelto, AHORA);
    expect(limitador.consultar('a', suelto, AHORA).permitida).toBe(false);

    // 60 por minuto es una por segundo: al segundo hay exactamente una ficha.
    expect(limitador.consultar('a', suelto, AHORA + 1_000).permitida).toBe(true);
    expect(limitador.consultar('a', suelto, AHORA + 1_000).permitida).toBe(false);
  });

  it('no acumula más allá de la ráfaga', () => {
    // Estar un día entero sin pedir nada no da derecho a mil de golpe.
    const limitador = new Limitador();
    limitador.consultar('a', suelto, AHORA);

    let pasadas = 0;
    for (let i = 0; i < 100; i++) {
      if (limitador.consultar('a', suelto, AHORA + 86_400_000).permitida) pasadas++;
    }

    expect(pasadas).toBe(suelto.rafaga);
  });

  it('cada clase de ruta lleva su propio cubo', () => {
    // El defecto que esto fija: con un cubo por dirección, gastarse la
    // telemetría dejaba a la misma persona sin poder abrir la lista de
    // pilotos. Comprobado contra el servidor antes de separarlos.
    const limitador = new Limitador();
    const caro = PRESUPUESTOS.telemetria;

    for (let i = 0; i < caro.rafaga + 5; i++) limitador.consultar('telemetria:a', caro, AHORA);
    expect(limitador.consultar('telemetria:a', caro, AHORA).permitida).toBe(false);

    expect(limitador.consultar('api:a', PRESUPUESTOS.api, AHORA).permitida).toBe(true);
  });

  it('cada quien tiene su cubo', () => {
    const limitador = new Limitador();
    for (let i = 0; i < suelto.rafaga; i++) limitador.consultar('a', suelto, AHORA);

    expect(limitador.consultar('a', suelto, AHORA).permitida).toBe(false);
    expect(limitador.consultar('b', suelto, AHORA).permitida).toBe(true);
  });

  it('un ritmo normal no se topa nunca', () => {
    // Quien navega despacio no debe notar que esto existe.
    const limitador = new Limitador();
    let cortadas = 0;

    for (let i = 0; i < 200; i++) {
      // Una cada dos segundos, con un presupuesto de una por segundo.
      if (!limitador.consultar('a', suelto, AHORA + i * 2_000).permitida) cortadas++;
    }

    expect(cortadas).toBe(0);
  });

  it('el propio limitador no se convierte en el ataque', () => {
    // Sin tope, variar la dirección de origen llenaría la memoria del servidor.
    const limitador = new Limitador();

    for (let i = 0; i < 30_000; i++) {
      limitador.consultar(`ip-${i}`, suelto, AHORA + i);
    }

    expect(limitador.tamaño).toBeLessThanOrEqual(20_000);
  });
});
