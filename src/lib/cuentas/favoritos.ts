/**
 * Los favoritos de una persona, y qué hacer cuando el aparato y la cuenta no
 * dicen lo mismo.
 *
 * ## Por qué hace falta decidir nada
 *
 * Los favoritos existían solo en el `localStorage` de cada navegador. Con
 * cuentas pasan a existir en dos sitios a la vez, y la primera vez que alguien
 * entra en un aparato hay que resolver qué gana. Es el momento en que se pueden
 * perder datos de verdad, así que la regla no se improvisa en la pantalla: vive
 * aquí, es pura, y se prueba.
 *
 * ## La regla, decidida con el usuario
 *
 * «Subir los del aparato la primera vez y preguntar a partir de la segunda, que
 * es lo que no pierde datos nunca.»
 *
 * De ahí salen los cuatro casos de abajo. El que importa es el último: cuando
 * los dos lados tienen cosas distintas, **no se elige por él**. Cualquier
 * automatismo ahí —que gane el más reciente, que gane el aparato, fusionarlos—
 * borra algo que alguien marcó a mano.
 */

/** Cuántos favoritos se aceptan, el mismo límite que en los avisos. */
export const MAXIMO_FAVORITOS = 40;

/** Un `driverId` o `constructorId` de Jolpica: minúsculas, dígitos y guiones. */
const ID_VALIDO = /^[a-z0-9_]+$/i;

export interface Favoritos {
  pilotos: string[];
  equipos: string[];
  /** El equipo que tiñe la app, o `null` si no eligió ninguno. */
  acento: string | null;
}

export const VACIOS: Favoritos = { pilotos: [], equipos: [], acento: null };

/**
 * Qué hacer cuando el aparato y la cuenta no coinciden.
 *
 * - `subir`: lo del aparato pasa a la cuenta.
 * - `bajar`: lo de la cuenta pasa al aparato.
 * - `nada`: ya dicen lo mismo.
 * - `preguntar`: los dos tienen cosas y son distintas. Decide la persona.
 */
export type Fusion = 'subir' | 'bajar' | 'nada' | 'preguntar';

/** ¿Está esta persona sin marcar nada? */
export function vacios(f: Favoritos): boolean {
  return f.pilotos.length === 0 && f.equipos.length === 0 && f.acento === null;
}

/** Dos listas son la misma si tienen los mismos elementos, en cualquier orden. */
function mismaLista(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const conjunto = new Set(a);
  return b.every((x) => conjunto.has(x));
}

export function iguales(a: Favoritos, b: Favoritos): boolean {
  return mismaLista(a.pilotos, b.pilotos) && mismaLista(a.equipos, b.equipos) && a.acento === b.acento;
}

/**
 * La decisión, en cuatro casos y sin ninguno más.
 *
 * El orden importa: «la cuenta está vacía» se mira ANTES que «son distintos»,
 * porque una cuenta recién estrenada es distinta de cualquier aparato con algo
 * marcado, y preguntar ahí sería preguntar por nada.
 */
export function decidirFusion(aparato: Favoritos, cuenta: Favoritos): Fusion {
  if (vacios(cuenta)) return vacios(aparato) ? 'nada' : 'subir';
  if (vacios(aparato)) return 'bajar';
  return iguales(aparato, cuenta) ? 'nada' : 'preguntar';
}

/**
 * Cuando los dos lados tienen cosas distintas: se juntan, no se elige.
 *
 * `decidirFusion` dice «preguntar» porque **ninguna elección automática es
 * correcta**, y eso sigue siendo verdad. Lo que pasa es que el usuario zanjó
 * que no quiere esa pregunta —«lo del conflicto no es gran cosa… con que al
 * entrar se carguen y se guarden los datos ya existentes»— y entre las salidas
 * posibles esta es la única que **no borra nada de nadie**: la unión de las dos
 * listas. Que gane el aparato, o la cuenta, o la más reciente, borraría a
 * alguien marcado a mano en el otro lado.
 *
 * Lo que sí hay que elegir es el acento, porque es uno solo y no se puede
 * unir. Gana el del aparato: es el color que se está viendo ahora mismo, y
 * cambiarlo de golpe al entrar sería lo más desconcertante que podría pasar.
 *
 * Si algún día se quiere la pregunta de verdad, esta función se sustituye por
 * la pantalla y `decidirFusion` no cambia.
 */
export function juntar(aparato: Favoritos, cuenta: Favoritos): Favoritos {
  const union = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]));

  return {
    pilotos: union(aparato.pilotos, cuenta.pilotos),
    equipos: union(aparato.equipos, cuenta.equipos),
    acento: aparato.acento ?? cuenta.acento,
  };
}

/**
 * De cómo lo guarda la base —`driverId` separados por comas— a listas.
 *
 * Se mantiene esa forma y no una tabla aparte porque es exactamente la que ya
 * usan los avisos en `PushSubscription`, y copiar los favoritos de un sitio al
 * otro tiene que ser trivial.
 */
export function leerLista(guardado: string | null | undefined): string[] {
  if (!guardado) return [];
  return guardado
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

/** La vuelta: de listas a lo que se guarda. Vacío se guarda como `null`, no como «». */
export function escribirLista(lista: string[]): string | null {
  return lista.length ? lista.join(',') : null;
}

/**
 * Lo que llega de fuera, limpio — o `null` si no tiene la forma esperada.
 *
 * Lo mismo que hace la ruta de los avisos con su lista: se rechaza entera en
 * vez de colar la mitad. Un favorito inventado no rompe nada visible, pero
 * queda guardado para siempre y luego aparece en un aviso.
 */
export function limpiarLista(valor: unknown): string[] | null {
  if (!Array.isArray(valor)) return null;
  if (valor.length > MAXIMO_FAVORITOS) return null;

  const limpios: string[] = [];
  for (const bruto of valor) {
    if (typeof bruto !== 'string') return null;
    const id = bruto.trim();
    if (!ID_VALIDO.test(id)) return null;
    if (!limpios.includes(id)) limpios.push(id);
  }
  return limpios;
}

/** El equipo del acento: uno solo, o nada. */
export function limpiarAcento(valor: unknown): string | null | undefined {
  if (valor === null) return null;
  if (typeof valor !== 'string') return undefined;
  const id = valor.trim();
  return ID_VALIDO.test(id) ? id : undefined;
}
