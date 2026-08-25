import { describe, expect, it } from 'vitest';
import { estadoEnPalabras, resumirEstado } from '@/lib/estado-resultado';

describe('resumirEstado', () => {
  it('el tiempo manda sobre el estado', () => {
    // Quien termina se identifica por su tiempo o su intervalo, nunca por la
    // palabra «Finished».
    expect(resumirEstado('1:34:02.123', 'Finished').corto).toBe('1:34:02.123');
    expect(resumirEstado('+11.536', 'Finished').corto).toBe('+11.536');
    expect(resumirEstado('+11.536', 'Finished').motivo).toBeNull();
  });

  it('abrevia el abandono a DNF y guarda el motivo', () => {
    const r = resumirEstado(null, 'Collision damage');
    expect(r.corto).toBe('DNF');
    expect(r.motivo).toBe('Daños por colisión');
    expect(r.clase).toBe('dnf');
  });

  it('distingue el que no salió del que abandonó', () => {
    expect(resumirEstado(null, 'Did not start').corto).toBe('DNS');
    expect(resumirEstado(null, 'Retired').corto).toBe('DNF');
  });

  it('distingue al descalificado', () => {
    expect(resumirEstado(null, 'Disqualified').corto).toBe('DSQ');
    expect(resumirEstado(null, 'Excluded').corto).toBe('DSQ');
    expect(resumirEstado(null, 'Excluded').motivo).toBe('Excluido');
  });

  it('las vueltas de más se cuentan, y en singular cuando es una', () => {
    expect(resumirEstado(null, '+1 Lap').corto).toBe('+1 vuelta');
    expect(resumirEstado(null, '+2 Laps').corto).toBe('+2 vueltas');
    expect(resumirEstado(null, '+42 Laps').corto).toBe('+42 vueltas');
  });

  it('estar doblado no es abandonar', () => {
    // Se clasificó: sacarlo como DNF sería decir que no terminó.
    const r = resumirEstado(null, 'Lapped');
    expect(r.corto).toBe('Doblado');
    expect(r.clase).toBe('vueltas');
  });

  it('un estado desconocido se muestra tal cual llegó', () => {
    // Preferible una palabra en inglés a un hueco.
    const r = resumirEstado(null, 'Nube de langostas');
    expect(r.corto).toBe('DNF');
    expect(r.motivo).toBe('Nube de langostas');
  });

  it('nada de lo que sale en la fila es más largo que un tiempo', () => {
    // Es la razón de ser del módulo: el hueco del apellido no puede volver a
    // perderse contra un estado de dieciséis caracteres.
    const estados = [
      'Collision damage',
      'Heat shield fire',
      'Cooling system',
      'Did not start',
      'Disqualified',
      'Power Unit',
      '+42 Laps',
    ];
    for (const estado of estados) {
      expect(resumirEstado(null, estado).corto.length).toBeLessThanOrEqual(11);
    }
  });
});

describe('estadoEnPalabras', () => {
  it('desarrolla las siglas, que un lector de pantalla no sabe leer', () => {
    expect(estadoEnPalabras(resumirEstado(null, 'Gearbox'))).toBe('Abandonó: caja de cambios');
    expect(estadoEnPalabras(resumirEstado(null, 'Withdrew'))).toBe(
      'No tomó la salida: se retiró del gran premio'
    );
  });

  it('no repite la etiqueta cuando el motivo ya es ella misma', () => {
    // «No tomó la salida: no tomó la salida» suena a error en un lector.
    expect(estadoEnPalabras(resumirEstado(null, 'Did not start'))).toBe('No tomó la salida');
    expect(estadoEnPalabras(resumirEstado(null, 'Disqualified'))).toBe('Descalificado');
    expect(estadoEnPalabras(resumirEstado(null, 'Retired'))).toBe('Abandonó');
  });

  it('quien termina se lee por su tiempo', () => {
    expect(estadoEnPalabras(resumirEstado('+11.536', 'Finished'))).toBe('+11.536');
  });
});
