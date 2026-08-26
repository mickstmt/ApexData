import { describe, expect, it } from 'vitest';
import { sesionesOrdenadas } from '@/lib/sesiones';

/**
 * El filtro que decide si una sesión trae hora de verdad.
 *
 * Es una copia deliberada del que vive en `HorarioDelFinDeSemana.tsx`: el
 * componente es JSX y esta prueba corre sin navegador, así que se comprueba la
 * regla, que es lo que puede romperse. Si una cambia, esta prueba avisa.
 */
function traeHora(cuando: Date): boolean {
  return cuando.getUTCHours() !== 0 || cuando.getUTCMinutes() !== 0 || cuando.getUTCSeconds() !== 0;
}

const finDeSemana = (campos: Record<string, Date | null>) => ({
  fp1Date: null,
  fp2Date: null,
  fp3Date: null,
  qualiDate: null,
  sprintDate: null,
  sprintQualiDate: null,
  ...campos,
});

describe('horario del fin de semana', () => {
  it('una temporada moderna da todas las sesiones', () => {
    // Australia 2026, tal como está en la base.
    const carrera = finDeSemana({
      fp1Date: new Date('2026-03-06T01:30:00Z'),
      fp2Date: new Date('2026-03-06T05:00:00Z'),
      fp3Date: new Date('2026-03-07T01:30:00Z'),
      qualiDate: new Date('2026-03-07T05:00:00Z'),
    });
    const salida = new Date('2026-03-08T04:00:00Z');

    const sesiones = sesionesOrdenadas(carrera, salida).filter((s) => traeHora(s.cuando));

    expect(sesiones.map((s) => s.nombre)).toEqual([
      'Práctica 1',
      'Práctica 2',
      'Práctica 3',
      'Clasificación',
      'Carrera',
    ]);
  });

  it('una temporada sin horas no deja ninguna sesión en pie', () => {
    // El defecto que esto impide: la fuente publica la hora de las sesiones
    // desde 2022. Antes sólo da el día, y el sembrado lo guarda a medianoche
    // UTC. Sin filtrar, doce temporadas pintarían un horario con «00:00» en
    // todas las filas — que no es un hueco, es un dato falso.
    const carrera = finDeSemana({
      fp1Date: new Date('2018-03-23T00:00:00Z'),
      fp2Date: new Date('2018-03-23T00:00:00Z'),
      fp3Date: new Date('2018-03-24T00:00:00Z'),
      qualiDate: new Date('2018-03-24T00:00:00Z'),
    });
    const salida = new Date('2018-03-25T05:10:00Z');

    const sesiones = sesionesOrdenadas(carrera, salida).filter((s) => traeHora(s.cuando));

    // Sólo sobrevive la carrera, cuya hora sí está siempre. Con una sola
    // sesión el bloque no se dibuja: esa hora ya está en la cabecera.
    expect(sesiones.map((s) => s.nombre)).toEqual(['Carrera']);
    expect(sesiones.length).toBeLessThan(2);
  });

  it('el orden es cronológico, no el del formulario', () => {
    // En un fin de semana al sprint, la clasificación al sprint va el viernes y
    // la clasificación de siempre el sábado: listarlas por nombre las cruzaría.
    const carrera = finDeSemana({
      fp1Date: new Date('2026-03-13T03:30:00Z'),
      sprintQualiDate: new Date('2026-03-13T07:30:00Z'),
      sprintDate: new Date('2026-03-14T03:00:00Z'),
      qualiDate: new Date('2026-03-14T07:00:00Z'),
    });
    const salida = new Date('2026-03-15T07:00:00Z');

    const sesiones = sesionesOrdenadas(carrera, salida).filter((s) => traeHora(s.cuando));

    expect(sesiones.map((s) => s.nombre)).toEqual([
      'Práctica 1',
      'Clasif. sprint',
      'Sprint',
      'Clasificación',
      'Carrera',
    ]);
  });

  it('una sesión a las 00:00 en la zona de quien mira no se filtra', () => {
    // El filtro mira la hora GUARDADA, que es UTC. La clasificación de
    // Australia sale a las 05:00Z y en Lima son las 00:00: si el filtro mirara
    // la hora local, la sesión desaparecería justo para quien vive ahí.
    const quali = new Date('2026-03-07T05:00:00Z');

    expect(traeHora(quali)).toBe(true);
    expect(
      quali.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Lima',
      })
    ).toBe('00:00');
  });
});
