import { describe, expect, it } from 'vitest';

import {
  apuntarVistos,
  CLAVE_VISTOS,
  leerVistos,
  pasosPendientes,
  vigente,
} from '@/lib/novedades/pendientes';
import { CADUCIDAD_DIAS, MAX_PASOS, NOVEDADES, type Novedad } from '@/lib/novedades/registro';

/** Un `localStorage` en memoria. */
function almacen(inicial: Record<string, string> = {}): Storage {
  const datos = new Map(Object.entries(inicial));
  return {
    get length() {
      return datos.size;
    },
    clear: () => datos.clear(),
    getItem: (k) => datos.get(k) ?? null,
    key: (i) => [...datos.keys()][i] ?? null,
    removeItem: (k) => void datos.delete(k),
    setItem: (k, v) => void datos.set(k, String(v)),
  };
}

/** Uno que lanza al tocarlo, como Safari con el almacenamiento bloqueado. */
const bloqueado = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('SecurityError');
  },
} as unknown as Storage;

const paso = (id: string) => ({ id, ancla: `#${id}`, titulo: id, texto: id });

const A: Novedad = { id: 'a', modulo: 'calc', desde: '2026-10-01', pasos: [paso('uno'), paso('dos')] };
const B: Novedad = { id: 'b', modulo: 'calc', desde: '2026-09-20', pasos: [paso('tres')] };
const OTRO: Novedad = { id: 'c', modulo: 'otro', desde: '2026-10-01', pasos: [paso('cuatro')] };

const dia = (s: string) => new Date(`${s}T12:00:00Z`);

describe('vigente', () => {
  it('sale desde el día de publicación y deja de salir a los treinta días', () => {
    expect(vigente(A, dia('2026-09-30'))).toBe(false);
    expect(vigente(A, dia('2026-10-01'))).toBe(true);
    expect(vigente(A, dia('2026-10-30'))).toBe(true);
    expect(vigente(A, dia('2026-10-31'))).toBe(false);
  });

  it('una fecha mal escrita no sale nunca, en vez de salir siempre', () => {
    expect(vigente({ ...A, desde: '1 de octubre' }, dia('2026-10-05'))).toBe(false);
  });
});

describe('pasosPendientes', () => {
  it('solo los del módulo, de la novedad más antigua a la más nueva', () => {
    const p = pasosPendientes([A, B, OTRO], 'calc', new Set(), dia('2026-10-05'));
    expect(p.map((x) => x.clave)).toEqual(['b/tres', 'a/uno', 'a/dos']);
  });

  it('quita los vistos y los caducados', () => {
    const p = pasosPendientes([A, B], 'calc', new Set(['a/uno']), dia('2026-10-25'));
    // B salió el 20 de septiembre: el 25 de octubre ya no es nueva.
    expect(p.map((x) => x.clave)).toEqual(['a/dos']);
  });
});

describe('lo visto, en el aparato', () => {
  it('se apunta sin perder lo que ya había', () => {
    const s = almacen();
    apuntarVistos(s, ['a/uno']);
    apuntarVistos(s, ['a/dos', 'a/uno']);
    expect(JSON.parse(s.getItem(CLAVE_VISTOS)!)).toEqual(['a/uno', 'a/dos']);
    expect(leerVistos([A], s)).toEqual(new Set(['a/uno', 'a/dos']));
  });

  it('un aviso de antes del registro cuenta como visto, solo para su paso', () => {
    const conHerencia = { ...A, heredados: { uno: 'clave-vieja' } };
    expect(leerVistos([conHerencia], almacen({ 'clave-vieja': '1' }))).toEqual(new Set(['a/uno']));
  });

  it('sin almacenamiento no sale: no se puede prometer «una sola vez»', () => {
    expect(leerVistos([A], bloqueado)).toBeNull();
    expect(() => apuntarVistos(bloqueado, ['a/uno'])).not.toThrow();
  });

  it('un valor roto cuenta como nada visto, y se reemplaza al escribir', () => {
    const s = almacen({ [CLAVE_VISTOS]: '{roto' });
    expect(leerVistos([A], s)).toEqual(new Set());
    apuntarVistos(s, ['a/uno']);
    expect(leerVistos([A], s)).toEqual(new Set(['a/uno']));
  });
});

describe('el registro', () => {
  it('cumple sus reglas', () => {
    const ids = NOVEDADES.map((n) => n.id);
    expect(new Set(ids).size, 'hay dos novedades con el mismo id').toBe(ids.length);

    for (const n of NOVEDADES) {
      expect(n.desde, `${n.id}: la fecha va como AAAA-MM-DD`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(n.desde)), `${n.id}: la fecha no existe`).toBe(false);
      expect(n.pasos.length, `${n.id}: entre 1 y ${MAX_PASOS} pasos`).toBeGreaterThan(0);
      expect(n.pasos.length, `${n.id}: entre 1 y ${MAX_PASOS} pasos`).toBeLessThanOrEqual(MAX_PASOS);

      const pasos = n.pasos.map((p) => p.id);
      expect(new Set(pasos).size, `${n.id}: dos pasos con el mismo id`).toBe(pasos.length);
      for (const heredado of Object.keys(n.heredados ?? {})) {
        expect(pasos, `${n.id}: «heredados» nombra un paso que no existe`).toContain(heredado);
      }
    }
  });

  it('caduca a los treinta días, como se acordó', () => {
    expect(CADUCIDAD_DIAS).toBe(30);
  });
});
