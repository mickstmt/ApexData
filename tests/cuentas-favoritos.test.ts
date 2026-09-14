import { describe, expect, it } from 'vitest';

import {
  VACIOS,
  decidirFusion,
  escribirLista,
  iguales,
  leerLista,
  limpiarAcento,
  limpiarLista,
  vacios,
  type Favoritos,
} from '@/lib/cuentas/favoritos';

/**
 * La regla de fusión es el único sitio de las cuentas donde se pueden perder
 * datos de verdad, así que se prueba entera y aparte de la pantalla.
 */

const con = (pilotos: string[], equipos: string[] = [], acento: string | null = null): Favoritos => ({
  pilotos,
  equipos,
  acento,
});

describe('qué hacer cuando el aparato y la cuenta no coinciden', () => {
  it('la primera vez, lo del aparato sube a la cuenta', () => {
    // Es la regla que eligió el usuario: entrar por primera vez no puede
    // vaciarte los favoritos que ya tenías marcados en ese navegador.
    expect(decidirFusion(con(['norris', 'leclerc']), VACIOS)).toBe('subir');
  });

  it('en un aparato nuevo, lo de la cuenta baja', () => {
    // El caso que da sentido a todo esto: estrenas teléfono y tus pilotos
    // aparecen solos.
    expect(decidirFusion(VACIOS, con(['norris']))).toBe('bajar');
  });

  it('si ya dicen lo mismo, no se toca nada', () => {
    expect(decidirFusion(con(['norris']), con(['norris']))).toBe('nada');
    expect(decidirFusion(VACIOS, VACIOS)).toBe('nada');
  });

  it('el orden no cuenta: son un conjunto, no una lista', () => {
    // Sin esto, abrir la app en otro aparato preguntaría por nada solo porque
    // los favoritos se guardaron en otro orden.
    expect(decidirFusion(con(['norris', 'leclerc']), con(['leclerc', 'norris']))).toBe('nada');
  });

  it('si los dos tienen cosas y son distintas, PREGUNTA', () => {
    // Lo importante de toda la regla. Cualquier automatismo aquí —que gane el
    // más reciente, que gane el aparato, fusionarlos— borra algo que alguien
    // marcó a mano.
    expect(decidirFusion(con(['norris']), con(['leclerc']))).toBe('preguntar');
  });

  it('también pregunta si lo que difiere es solo el acento', () => {
    expect(decidirFusion(con(['norris'], [], 'mclaren'), con(['norris'], [], 'ferrari'))).toBe(
      'preguntar'
    );
  });

  it('también pregunta si uno tiene equipos y el otro no', () => {
    expect(decidirFusion(con(['norris'], ['mclaren']), con(['norris']))).toBe('preguntar');
  });

  it('una cuenta con solo acento NO está vacía', () => {
    // Si contara como vacía, entrar sobreescribiría el acento elegido sin
    // preguntar.
    expect(vacios(con([], [], 'ferrari'))).toBe(false);
    expect(decidirFusion(con(['norris']), con([], [], 'ferrari'))).toBe('preguntar');
  });
});

describe('cómo se guardan', () => {
  it('van y vuelven de la forma que ya usan los avisos', () => {
    expect(leerLista('norris,leclerc')).toEqual(['norris', 'leclerc']);
    expect(escribirLista(['norris', 'leclerc'])).toBe('norris,leclerc');
  });

  it('vacío se guarda como nulo, no como cadena vacía', () => {
    // Una cadena vacía en la base se lee luego como «hay algo» en más de un
    // sitio, y lo que hay es nada.
    expect(escribirLista([])).toBeNull();
  });

  it('aguanta lo que ya hubiera guardado con espacios o comas de más', () => {
    expect(leerLista(' norris , leclerc ,')).toEqual(['norris', 'leclerc']);
    expect(leerLista(null)).toEqual([]);
    expect(leerLista('')).toEqual([]);
  });
});

describe('lo que llega de fuera', () => {
  it('se rechaza entero, no a medias', () => {
    // Un favorito inventado no rompe nada visible, pero queda guardado para
    // siempre y luego aparece en un aviso.
    expect(limpiarLista(['norris', 'no válido!'])).toBeNull();
    expect(limpiarLista('norris')).toBeNull();
    expect(limpiarLista([1, 2])).toBeNull();
  });

  it('quita repetidos y recorta', () => {
    expect(limpiarLista([' norris ', 'norris', 'leclerc'])).toEqual(['norris', 'leclerc']);
  });

  it('no acepta una lista desmedida', () => {
    expect(limpiarLista(Array.from({ length: 41 }, (_, i) => `p${i}`))).toBeNull();
  });

  it('el acento distingue «quítalo» de «no lo toques»', () => {
    // `null` es una orden: borrar el acento. `undefined` es que no venía en la
    // petición y hay que dejarlo como está. Confundirlos borra el acento cada
    // vez que se guarda cualquier otra cosa.
    expect(limpiarAcento(null)).toBeNull();
    expect(limpiarAcento('ferrari')).toBe('ferrari');
    expect(limpiarAcento('no válido!')).toBeUndefined();
    expect(limpiarAcento(7)).toBeUndefined();
  });
});

describe('iguales', () => {
  it('compara las tres cosas', () => {
    expect(iguales(con(['a'], ['b'], 'c'), con(['a'], ['b'], 'c'))).toBe(true);
    expect(iguales(con(['a'], ['b'], 'c'), con(['a'], ['b'], 'd'))).toBe(false);
  });
});
