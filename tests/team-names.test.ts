import { describe, expect, it } from 'vitest';
import { teamColor, teamIdFromName } from '@/lib/team-colors';

describe('teamIdFromName', () => {
  it('reconoce los nombres que manda FastF1 en 2024', () => {
    // Los veinte de Baréin 2024, tal cual llegan en las vueltas.
    const reales: [string, string][] = [
      ['Red Bull Racing', 'red_bull'],
      ['Ferrari', 'ferrari'],
      ['Mercedes', 'mercedes'],
      ['McLaren', 'mclaren'],
      ['Aston Martin', 'aston_martin'],
      ['Kick Sauber', 'sauber'],
      ['Haas F1 Team', 'haas'],
      ['RB', 'rb'],
      ['Williams', 'williams'],
      ['Alpine', 'alpine'],
    ];

    for (const [nombre, id] of reales) {
      expect(teamIdFromName(nombre)).toBe(id);
    }
  });

  it('aguanta los nombres con patrocinador, que cambian cada año', () => {
    expect(teamIdFromName('Stake F1 Team Kick Sauber')).toBe('sauber');
    expect(teamIdFromName('Visa Cash App RB Formula One Team')).toBe('rb');
    expect(teamIdFromName('BWT Alpine F1 Team')).toBe('alpine');
    expect(teamIdFromName('Alfa Romeo Racing')).toBe('alfa');
  });

  it('no confunde Red Bull con Racing Bulls', () => {
    // «Red Bull Racing» contiene «racing», y «Racing Bulls» contiene «bulls»:
    // buscar por trozos sueltos sin orden los intercambiaría.
    expect(teamIdFromName('Red Bull Racing')).toBe('red_bull');
    expect(teamIdFromName('Racing Bulls')).toBe('rb');
  });

  it('devuelve nulo con un nombre desconocido o vacío', () => {
    expect(teamIdFromName('Equipo Inventado')).toBeNull();
    expect(teamIdFromName(null)).toBeNull();
    expect(teamIdFromName('')).toBeNull();
  });

  it('lo que devuelve sirve para pedir color', () => {
    // El contrato que de verdad importa: que el identificador exista en la
    // paleta y no acabe en el gris de reserva.
    const gris = teamColor('inexistente').color;
    expect(teamColor(teamIdFromName('Kick Sauber')).color).not.toBe(gris);
    expect(teamColor(teamIdFromName('Haas F1 Team')).color).not.toBe(gris);
  });
});
