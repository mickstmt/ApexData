import { describe, expect, it } from 'vitest';
import { formatoReloj, instanteTras, saltoDe, siguienteVelocidad } from '@/lib/replay/reloj';

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
    expect(formatoReloj(3725)).toBe('62:05');
    expect(formatoReloj(-3)).toBe('0:00');
  });

  it('diez segundos son cuarenta instantes', () => {
    expect(saltoDe(10, 0.25)).toBe(40);
  });
});
