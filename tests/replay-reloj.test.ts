import { describe, expect, it } from 'vitest';
import {
  anchoDelReloj,
  formatoReloj,
  instanteTras,
  saltoDe,
  saltoReal,
  siguienteVelocidad,
  textoDelSalto,
} from '@/lib/replay/reloj';

describe('el reloj del replay', () => {
  it('a 1× un segundo real son cuatro instantes de 0,25 s', () => {
    expect(instanteTras(100, 1000, 1, 0.25, 1000)).toBe(104);
    expect(instanteTras(100, 1000, 8, 0.25, 1000)).toBe(132);
  });

  it('cae entre dos muestras, que es lo que permite interpolar', () => {
    expect(instanteTras(0, 100, 1, 0.25, 1000)).toBeCloseTo(0.4, 6);
  });

  it('no se sale de la carrera', () => {
    expect(instanteTras(990, 60_000, 8, 0.25, 1000)).toBe(999);
    expect(instanteTras(5, -60_000, 1, 0.25, 1000)).toBe(0);
  });

  it('las velocidades dan la vuelta', () => {
    expect(siguienteVelocidad(1)).toBe(2);
    expect(siguienteVelocidad(8)).toBe(1);
  });

  it('el reloj se lee como el de una carrera', () => {
    expect(formatoReloj(0)).toBe('0:00');
    expect(formatoReloj(95.9)).toBe('1:35');
    expect(formatoReloj(-3)).toBe('0:00');
  });

  it('saca la hora en cuanto la hay, y no antes', () => {
    // Antes daba minutos sin límite: el final de una carrera de hora y cuarto
    // marcaba «78:42», que fuera de contexto hay que dividir mentalmente.
    expect(formatoReloj(4722)).toBe('1:18:42');
    expect(formatoReloj(3725)).toBe('1:02:05');

    // Y justo en la frontera, sin un «0:» de relleno por debajo.
    expect(formatoReloj(3599)).toBe('59:59');
    expect(formatoReloj(3600)).toBe('1:00:00');
    expect(formatoReloj(2900)).toBe('48:20');
  });

  it('dice cuánto hueco reservar, para que no salte al cruzar la hora', () => {
    expect(anchoDelReloj(2900)).toBe(5);   // 48:20
    expect(anchoDelReloj(4722)).toBe(7);   // 1:18:42
  });

  it('diez segundos son cuarenta instantes', () => {
    expect(saltoDe(10, 0.25)).toBe(40);
  });
});

describe('el salto que de verdad ocurre', () => {
  // count = 401 instantes de 0,25 s: una carrera de 100 s justos.
  const COUNT = 401;
  const PASO = 0.25;

  it('en medio de la carrera son los diez segundos enteros', () => {
    expect(saltoReal(200, 40, COUNT, PASO)).toBe(10);
    expect(saltoReal(200, -40, COUNT, PASO)).toBe(-10);
  });

  it('se recorta contra los topes, y dice lo que se movió', () => {
    // A los cuatro segundos de carrera, «10 s atrás» mueve cuatro. Decir diez
    // sería mentir, y es lo que hace que un indicador nuevo se sienta roto.
    expect(saltoReal(16, -40, COUNT, PASO)).toBe(-4);
    expect(saltoReal(COUNT - 1 - 8, 40, COUNT, PASO)).toBe(2);
  });

  it('devuelve cero cuando ya no queda nada que saltar', () => {
    // Es así como el botón sabe que tiene que apagarse.
    expect(saltoReal(0, -40, COUNT, PASO)).toBe(0);
    expect(saltoReal(COUNT - 1, 40, COUNT, PASO)).toBe(0);
  });

  it('no redondea: medio segundo no es cero, y el botón tiene que seguir vivo', () => {
    // La zona muerta que tenía. Con `Math.round`, esto daba `-0` —igual a 0 en
    // JavaScript— y el botón de atrás se apagaba a dos instantes del inicio.
    expect(saltoReal(2, -40, COUNT, PASO)).toBe(-0.5);
    expect(saltoReal(1, -40, COUNT, PASO)).toBe(-0.25);
    expect(saltoReal(2, -40, COUNT, PASO)).not.toBe(0);
  });
});

describe('el salto, escrito', () => {
  it('lleva su signo y su unidad', () => {
    expect(textoDelSalto(10)).toBe('+10 s');
    expect(textoDelSalto(-10)).toBe('−10 s');
    expect(textoDelSalto(-4)).toBe('−4 s');
  });

  it('por debajo de un segundo se dice con decimal, no redondeado a cero', () => {
    // «−0 s» era el resultado de redondear al alza; «−1 s» sería mentir en el
    // otro sentido sobre un movimiento de medio segundo.
    expect(textoDelSalto(-0.5)).toBe('−0,5 s');
    expect(textoDelSalto(0.25)).toBe('+0,3 s');
  });

  it('a partir de un segundo se redondea alejándose del cero', () => {
    expect(textoDelSalto(1.4)).toBe('+1 s');
    expect(textoDelSalto(-2.6)).toBe('−3 s');
  });
});
