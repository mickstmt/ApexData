import { CADUCIDAD_DIAS, type Novedad, type PasoDeNovedad } from './registro';

/**
 * Qué pasos le quedan por ver a quien entra en un módulo, y dónde se apunta lo
 * que ya vio.
 *
 * Lo visto se guarda en el aparato, no en la cuenta: la guía sale también a
 * quien no ha iniciado sesión. En el iPhone, Safari y la app instalada guardan
 * cada uno lo suyo, así que puede salir una vez en cada sitio, y se acepta.
 */

export const CLAVE_VISTOS = 'apexdata-novedades-vistas';

export interface PasoPendiente extends PasoDeNovedad {
  /** `novedad/paso`: lo que se apunta como visto. */
  clave: string;
}

export const claveDePaso = (novedad: Novedad, paso: PasoDeNovedad) => `${novedad.id}/${paso.id}`;

const DIA = 24 * 60 * 60 * 1000;

/** Si la novedad ya salió y aún no ha caducado. */
export function vigente(novedad: Novedad, ahora: Date): boolean {
  const desde = Date.parse(`${novedad.desde}T00:00:00Z`);
  if (Number.isNaN(desde)) return false;
  const t = ahora.getTime();
  return t >= desde && t < desde + CADUCIDAD_DIAS * DIA;
}

/** Los pasos de un módulo que siguen por ver, de la novedad más antigua a la más nueva. */
export function pasosPendientes(
  novedades: readonly Novedad[],
  modulo: string,
  vistos: ReadonlySet<string>,
  ahora: Date
): PasoPendiente[] {
  return novedades
    .filter((n) => n.modulo === modulo && vigente(n, ahora))
    .sort((a, b) => a.desde.localeCompare(b.desde))
    .flatMap((n) =>
      n.pasos
        .map((p) => ({ ...p, clave: claveDePaso(n, p) }))
        .filter((p) => !vistos.has(p.clave))
    );
}

/**
 * Lo visto en este aparato, o `null` si no se puede leer.
 *
 * Sin almacenamiento no se puede prometer «una sola vez», y quien lo tiene
 * bloqueado vería la guía en cada visita. Con `null`, la guía no sale.
 */
export function leerVistos(novedades: readonly Novedad[], almacen: Storage): Set<string> | null {
  try {
    const vistos = new Set<string>();
    for (const clave of guardados(almacen)) vistos.add(clave);
    for (const n of novedades) {
      for (const [paso, clave] of Object.entries(n.heredados ?? {})) {
        if (almacen.getItem(clave) !== null) vistos.add(`${n.id}/${paso}`);
      }
    }
    return vistos;
  } catch {
    // Modo privado o almacenamiento bloqueado.
    return null;
  }
}

/**
 * Las claves guardadas. Un valor roto cuenta como nada visto: tratarlo como
 * almacenamiento bloqueado dejaría la guía sin salir para siempre, porque
 * nadie lo volvería a escribir. Lanza solo si el almacenamiento lanza.
 */
function guardados(almacen: Storage): string[] {
  const texto = almacen.getItem(CLAVE_VISTOS);
  try {
    const valor: unknown = JSON.parse(texto ?? '[]');
    return Array.isArray(valor) ? valor.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Apunta pasos como vistos, sin perder los que ya estaban.
 *
 * Se vuelve a leer antes de escribir: la misma pantalla abierta en dos
 * pestañas no se pisa lo que apuntó la otra.
 */
export function apuntarVistos(almacen: Storage, claves: readonly string[]): void {
  if (claves.length === 0) return;
  try {
    const todos = new Set(guardados(almacen));
    for (const c of claves) todos.add(c);
    almacen.setItem(CLAVE_VISTOS, JSON.stringify([...todos]));
  } catch {
    // Si no deja guardar, la guía se cierra igual; solo volvería a salir.
  }
}
