import { describe, expect, it } from 'vitest';

import {
  construirDirectorio,
  fichaDesconocida,
  type EntradaDeParrilla,
} from '@/lib/parrilla';

/**
 * El cruce que hacía falta para que las prácticas dejaran de ser pobres.
 *
 * FastF1 manda «VER» y «Red Bull Racing», y nada más: ni foto, ni dorsal, ni
 * nacionalidad, ni nombre completo. Todo eso está guardado y nadie lo cruzaba,
 * y por eso esas tablas se veían como se veían (punto 46).
 *
 * Lo que se prueba aquí es la regla que no se ve mirando el código: **gana la
 * primera fuente**. Importa porque la primera es el propio fin de semana y la
 * segunda es la última ronda corrida; si ganara la segunda, un piloto que
 * cambió de equipo aparecería en las prácticas del viernes con el escudo del
 * equipo que dejó.
 */

function entrada(
  code: string | null,
  nombre: string,
  equipo: string,
  equipoId: string,
  extra: Partial<EntradaDeParrilla['driver']> = {}
): EntradaDeParrilla {
  return {
    driver: {
      driverId: nombre.toLowerCase(),
      givenName: nombre,
      familyName: 'Apellido',
      code,
      permanentNumber: 1,
      nationality: 'Dutch',
      imageUrl: `/fotos/${nombre}.png`,
      ...extra,
    },
    team: { name: equipo, constructorId: equipoId, nationality: 'Austrian' },
  };
}

describe('el directorio de pilotos', () => {
  it('encuentra al piloto por sus tres letras, en mayúsculas', () => {
    const directorio = construirDirectorio([entrada('ver', 'Max', 'Red Bull', 'red_bull')]);

    expect(directorio.VER?.nombre).toBe('Max Apellido');
    expect(directorio.VER?.foto).toBe('/fotos/Max.png');
    expect(directorio.VER?.dorsal).toBe(1);
    expect(directorio.VER?.nacion).toBe('Dutch');
    expect(directorio.VER?.equipoNacion).toBe('Austrian');
  });

  it('manda la primera fuente, que es la del propio fin de semana', () => {
    // El mismo piloto en dos fuentes con equipos distintos: el de esta carrera
    // primero, el de la última ronda corrida después.
    const directorio = construirDirectorio(
      [entrada('HAM', 'Lewis', 'Ferrari', 'ferrari')],
      [entrada('HAM', 'Lewis', 'Mercedes', 'mercedes')]
    );

    expect(directorio.HAM?.equipo).toBe('Ferrari');
  });

  it('completa con la segunda fuente a quien falte en la primera', () => {
    const directorio = construirDirectorio(
      [entrada('HAM', 'Lewis', 'Ferrari', 'ferrari')],
      [entrada('VER', 'Max', 'Red Bull', 'red_bull')]
    );

    expect(Object.keys(directorio).sort()).toEqual(['HAM', 'VER']);
  });

  it('a quien no tiene código no se le puede buscar, así que no entra', () => {
    // Pasa con pilotos antiguos: `code` es opcional en la base. Sin él no hay
    // clave, y meterlo con una inventada haría que otro piloto la encontrara.
    const directorio = construirDirectorio([entrada(null, 'Anónimo', 'Lotus', 'lotus')]);

    expect(Object.keys(directorio)).toHaveLength(0);
  });

  it('a quien no aparece se le deja su código, no la ficha de otro', () => {
    const ficha = fichaDesconocida('XYZ', 'Haas F1 Team');

    expect(ficha.nombre).toBe('XYZ');
    expect(ficha.equipo).toBe('Haas F1 Team');
    expect(ficha.foto).toBeNull();
    expect(ficha.dorsal).toBeNull();
    // Sin `driverId` la fila no enlaza a ninguna ficha: es lo que impide
    // mandar a alguien a la página de un piloto que no es.
    expect(ficha.driverId).toBe('');
  });

  it('sin equipo tampoco inventa uno', () => {
    expect(fichaDesconocida('XYZ', null).equipo).toBe('—');
  });
});
