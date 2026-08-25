import { describe, expect, it } from 'vitest';
import { logoVaEnColor, TEAM_IDS } from '@/lib/team-colors';

/**
 * La excepción del logo en color.
 *
 * La regla general es que un recurso importado no trae su propia tinta: se
 * pinta a un solo color para que se lea en los dos temas. Con los logotipos
 * tipográficos funciona; con una marca figurativa, no.
 */

describe('qué logos van en color', () => {
  it('Ferrari sí, porque su escudo no sobrevive a ser una silueta', () => {
    // El caballo está pintado SOBRE el campo amarillo, no recortado de él: al
    // teñir todo de una tinta, los dos pasan a ser el mismo color y queda un
    // bloque macizo. Comprobado con tres archivos distintos.
    expect(logoVaEnColor('ferrari')).toBe(true);
  });

  it('los demás no: son el nombre escrito y aguantan la silueta', () => {
    for (const id of ['mclaren', 'williams', 'cadillac', 'mercedes', 'red_bull', 'aston_martin']) {
      expect(logoVaEnColor(id), id).toBe(false);
    }
  });

  it('la excepción es UNA, y así debe seguir salvo motivo', () => {
    // Una excepción se lee como una decisión; muchas se leen como un parche.
    // Si esta cuenta sube, que sea porque alguien lo decidió y lo escribió.
    const enColor = TEAM_IDS.filter((id) => logoVaEnColor(id));
    expect(enColor).toEqual(['ferrari']);
  });

  it('sin equipo no revienta', () => {
    expect(logoVaEnColor(null)).toBe(false);
    expect(logoVaEnColor(undefined)).toBe(false);
    expect(logoVaEnColor('equipo-inventado')).toBe(false);
  });
});
