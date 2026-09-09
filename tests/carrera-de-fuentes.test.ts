import { describe, expect, it } from 'vitest';

import { FUENTES, VENTANA_HORAS, dentroDeLaVentana } from '@/lib/push/carrera-de-fuentes';

const AHORA = new Date('2026-09-11T14:00:00Z');
const haceMinutos = (m: number) => new Date(AHORA.getTime() - m * 60_000).toISOString();

describe('la ventana en que se sondea a las fuentes', () => {
  it('empieza en el segundo cero, no a los treinta minutos', () => {
    // OpenF1 declara que publica media hora después. Empezar a sondear en ese
    // momento daría por buena su propia afirmación en vez de medirla, y es
    // justo lo que este experimento existe para comprobar.
    expect(dentroDeLaVentana(haceMinutos(0), AHORA)).toBe(true);
    expect(dentroDeLaVentana(haceMinutos(1), AHORA)).toBe(true);
  });

  it('no sondea sesiones que aún no han terminado', () => {
    expect(dentroDeLaVentana(haceMinutos(-10), AHORA)).toBe(false);
  });

  it('deja de sondear pasadas las ocho horas', () => {
    expect(dentroDeLaVentana(haceMinutos(VENTANA_HORAS * 60 - 1), AHORA)).toBe(true);
    expect(dentroDeLaVentana(haceMinutos(VENTANA_HORAS * 60 + 1), AHORA)).toBe(false);
  });

  it('una fecha ilegible no entra', () => {
    expect(dentroDeLaVentana('no es una fecha', AHORA)).toBe(false);
  });

  it('compiten exactamente dos', () => {
    expect([...FUENTES]).toEqual(['openf1', 'fastf1']);
  });
});
