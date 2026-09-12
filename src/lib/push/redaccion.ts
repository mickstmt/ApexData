import type { FilaDeSesion } from '@/services/openf1/tipos';

/**
 * Cómo se redacta el aviso de una sesión.
 *
 * Todo lo de aquí es puro: entra una clasificación y salen dos cadenas. No
 * consulta la base, no llama a nadie y no depende de la hora — por eso se puede
 * comprobar contra un fin de semana real sin esperar a que haya carrera.
 */

/** Los cinco comportamientos distintos. Siete sesiones, cinco formas de contarlas. */
export type TipoDeSesion = 'practica' | 'quali' | 'sprint-quali' | 'sprint' | 'carrera';

export interface Sesion {
  /**
   * Con qué se guarda en las preferencias de la suscripción.
   *
   * Corto y estable a propósito: se escribe en la base separado por comas y
   * cambiarlo dejaría sin efecto las preferencias ya guardadas.
   */
  codigo: string;
  /** Como se dice en la notificación: «Práctica 1», «Clasificación»… */
  nombre: string;
  /**
   * A qué pestaña de la ficha lleva el aviso.
   *
   * Vive aquí, pegado al código, y no en quien construye la dirección, porque
   * eso era justo el fallo: los avisos abrían `/results/{año}/{ronda}` a secas
   * y aterrizaban en la pestaña por defecto. Tocar el aviso de la clasificación
   * del sábado llevaba a CARRERA, que ni se había corrido.
   *
   * Son los identificadores que `RaceDetailClient` acepta por `?sesion=`. Si
   * alguien añade una sesión aquí, el tipo le obliga a decir dónde vive.
   */
  pestana: PestanaDeSesion;
  tipo: TipoDeSesion;
}

/** Las pestañas de la ficha de carrera, tal como las lee `?sesion=`. */
export type PestanaDeSesion =
  | 'practice1'
  | 'practice2'
  | 'practice3'
  | 'sprint-qualifying'
  | 'sprint'
  | 'qualifying'
  | 'race';

/**
 * Lo que cabe en la pantalla de bloqueo antes de que iOS corte el texto.
 *
 * Dos líneas. Lo que pase de aquí sigue estando —se ve manteniendo pulsado—
 * pero deja de leerse de un vistazo, que es para lo que sirve un aviso.
 */
export const LIMITE_CARACTERES = 90;

/** Cuántos favoritos se nombran como mucho. */
const MAXIMO_FAVORITOS = 2;

/** Los nombres de OpenF1, traducidos y clasificados por comportamiento. */
export const SESIONES: Record<string, Sesion> = {
  'Practice 1': { codigo: 'FP1', nombre: 'Práctica 1', pestana: 'practice1', tipo: 'practica' },
  'Practice 2': { codigo: 'FP2', nombre: 'Práctica 2', pestana: 'practice2', tipo: 'practica' },
  'Practice 3': { codigo: 'FP3', nombre: 'Práctica 3', pestana: 'practice3', tipo: 'practica' },
  'Sprint Qualifying': {
    codigo: 'SQ',
    nombre: 'Clasificación al sprint',
    pestana: 'sprint-qualifying',
    tipo: 'sprint-quali',
  },
  Sprint: { codigo: 'S', nombre: 'Sprint', pestana: 'sprint', tipo: 'sprint' },
  Qualifying: { codigo: 'Q', nombre: 'Clasificación', pestana: 'qualifying', tipo: 'quali' },
  Race: { codigo: 'R', nombre: 'Carrera', pestana: 'race', tipo: 'carrera' },
};

/**
 * La dirección de la ficha, abierta por la pestaña de esa sesión.
 *
 * `race` se deja sin parámetro a propósito: es la pestaña por defecto, y
 * añadirlo solo alargaría la dirección sin cambiar dónde se aterriza.
 */
export function rutaDeSesion(year: number, round: number, pestana: PestanaDeSesion): string {
  const base = `/results/${year}/${round}`;
  return pestana === 'race' ? base : `${base}?sesion=${pestana}`;
}

/** Todos los códigos, que es lo que recibe quien no ha tocado nada. */
export const TODAS_LAS_SESIONES = Object.values(SESIONES).map((s) => s.codigo);

/**
 * ¿Quiere esta persona el aviso de esta sesión?
 *
 * `null` significa todas: es lo que se pidió —las siete— y también lo que
 * reciben las suscripciones que existían antes de que hubiera preferencias.
 */
export function quiereLaSesion(preferencia: string | null | undefined, codigo: string): boolean {
  if (preferencia == null) return true;

  const elegidas = preferencia
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  // Una lista vacía es «ninguna», no «todas»: si alguien apaga las siete, hay
  // que respetarlo en vez de mandárselas todas.
  return elegidas.includes(codigo);
}

/** ¿Esta sesión se cuenta como una carrera —hay ganador y podio? */
const esCarrera = (tipo: TipoDeSesion) => tipo === 'carrera' || tipo === 'sprint';

/** ¿Esta sesión reparte una pole? */
const esClasificacion = (tipo: TipoDeSesion) => tipo === 'quali' || tipo === 'sprint-quali';

/**
 * El apellido, en capitalización normal.
 *
 * OpenF1 manda «Kimi ANTONELLI»: nombre de pila delante y apellido en
 * mayúsculas. En un aviso corto el apellido solo es lo que se lee, y gritado
 * queda mal.
 *
 * El apellido se reconoce por **estar en mayúsculas**, no por su posición. Con
 * «quitar la primera palabra» bastaba para casi todos, pero un nombre como
 * «Juan Manuel FANGIO DEL CARRIL» salía como «Manuel Fangio Del Carril»: el
 * segundo nombre de pila se colaba. La mayúscula es la marca de la fuente, así
 * que es lo que hay que mirar.
 */
export function apellido(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return nombreCompleto;

  const tieneLetras = (t: string) => /\p{L}/u.test(t);
  const gritadas = partes.filter((t) => tieneLetras(t) && t === t.toLocaleUpperCase('es'));

  // Sin mayúsculas que delaten el apellido —una fuente que no las use— se
  // vuelve a la regla vieja: todo menos el nombre de pila.
  const trozos = gritadas.length ? gritadas : partes.length > 1 ? partes.slice(1) : partes;

  return trozos
    .join(' ')
    .split(/([ -])/)
    .map((t) => (t === ' ' || t === '-' ? t : t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()))
    .join('');
}

/** Segundos a `m:ss.mmm`, que es como se lee una vuelta. */
export function vuelta(segundos: number | null): string | null {
  if (segundos == null || !Number.isFinite(segundos)) return null;

  const minutos = Math.floor(segundos / 60);
  const resto = (segundos - minutos * 60).toFixed(3).padStart(6, '0');

  return `${minutos}:${resto}`;
}

/**
 * Una diferencia de tiempo con los decimales que le tocan.
 *
 * Tres decimales por debajo de diez segundos —así se leen los huecos de una
 * clasificación— y uno por encima, donde la milésima ya no dice nada.
 */
export function diferencia(segundos: number | null): string | null {
  if (segundos == null || !Number.isFinite(segundos)) return null;
  return segundos < 10 ? segundos.toFixed(3) : segundos.toFixed(1);
}

/** Un piloto al que sigues, ya resuelto a su código y su nombre. */
export interface Favorito {
  /** El de tres letras, que es como los nombra OpenF1. */
  codigo: string;
  nombre: string;
}

/** Dónde quedó alguien, en corto. */
function situacion(fila: FilaDeSesion, tipo: TipoDeSesion): string {
  if (fila.ausente) return 'no salió a pista';
  if (fila.descalificado) return 'descalificado';
  if (fila.noSalio) return 'no tomó la salida';
  if (fila.abandono) return esCarrera(tipo) ? 'abandonó' : 'no terminó';
  if (fila.puesto == null) return 'sin clasificar';
  return `${fila.puesto}.º`;
}

/** ¿Tiene un puesto limpio del que se pueda hablar con normalidad? */
function clasificado(fila: FilaDeSesion): boolean {
  return (
    !fila.ausente &&
    fila.puesto != null &&
    !fila.abandono &&
    !fila.noSalio &&
    !fila.descalificado
  );
}

/**
 * Tus favoritos en esta sesión, del mejor puesto al peor.
 *
 * Quien no aparezca se marca como ausente en vez de descartarse: ver
 * `FilaDeSesion.ausente`.
 */
function misFilas(favoritos: Favorito[], filas: FilaDeSesion[]): FilaDeSesion[] {
  return favoritos
    .map(
      (fav): FilaDeSesion =>
        filas.find((f) => f.codigo === fav.codigo) ?? {
          puesto: null,
          dorsal: 0,
          nombre: fav.nombre,
          codigo: fav.codigo,
          equipo: '',
          color: null,
          tiempo: null,
          puntos: null,
          abandono: false,
          noSalio: false,
          descalificado: false,
          ausente: true,
        }
    )
    .sort((a, b) => (a.puesto ?? 99) - (b.puesto ?? 99));
}

interface Trozo {
  /** En qué orden se lee. Mayor va antes. */
  orden: number;
  /** En qué orden se añade. Menor entra primero, así que sobrevive. */
  peso: number;
  texto: string;
}

/**
 * El aviso de una sesión, armado por presupuesto de caracteres.
 *
 * ## Por qué presupuesto y no una plantilla fija
 *
 * Con un favorito cabe todo. Con tres, no: medido sobre el GP de Italia 2026,
 * ganador + podio + tres favoritos son 97 caracteres y el límite son 90. Una
 * plantilla fija obliga a elegir de antemano qué se sacrifica siempre; así se
 * sacrifica solo cuando hace falta.
 *
 * El orden en que se leen no es el orden en que se descartan. Se lee «ganador,
 * puntos, podio, los tuyos», pero si algo se cae, se cae el podio antes que tu
 * piloto — que es lo que distingue este aviso de uno genérico.
 *
 * Comprobado sobre las 1.540 combinaciones de tres favoritos de aquel fin de
 * semana: ninguna pasa de 90.
 */
export function redactarCuerpo(opciones: {
  tipo: TipoDeSesion;
  filas: FilaDeSesion[];
  /** Vacío es válido: el aviso sale igual, solo que sin hablar de ti. */
  favoritos: Favorito[];
  /** Añadir el podio. Solo tiene sentido en carrera y sprint. */
  podio: boolean;
}): string {
  const { tipo, filas, favoritos, podio } = opciones;

  const lider = filas[0];
  if (!lider) return 'Sesión terminada.';

  const mios = misFilas(favoritos, filas);

  const nombrados = new Set<string>();
  const trozos: Trozo[] = [];
  let fijo: string;

  if (esCarrera(tipo)) {
    const ganador = mios[0]?.puesto === 1 ? mios[0] : null;

    if (ganador) {
      fijo = `Ganó ${apellido(ganador.nombre)}.`;
      nombrados.add(ganador.codigo);

      if (ganador.puntos) {
        trozos.push({
          orden: 3,
          peso: 3,
          texto: `${ganador.puntos} puntos para ${ganador.equipo}.`,
        });
      }
    } else {
      fijo = `Ganó ${apellido(lider.nombre)}${lider.equipo ? ` (${lider.equipo})` : ''}.`;
      nombrados.add(lider.codigo);
    }

    if (podio) {
      const resto = filas.slice(0, 3).filter((f) => !nombrados.has(f.codigo));

      if (resto.length) {
        resto.forEach((f) => nombrados.add(f.codigo));
        trozos.push({
          orden: 2,
          peso: 2,
          texto: `Detrás, ${resto.map((f) => apellido(f.nombre)).join(' y ')}.`,
        });
      }
    }
  } else {
    // Un solo favorito da para la frase larga, con el hueco al más rápido. Con
    // dos ya no cabe y se pasa a la lista corta.
    const uno = mios.length === 1 && clasificado(mios[0]) ? mios[0] : null;

    if (uno) {
      const hueco = diferencia(
        uno.tiempo != null && lider.tiempo != null ? uno.tiempo - lider.tiempo : null
      );

      if (uno.puesto === 1) {
        return esClasificacion(tipo)
          ? `¡Pole para ${apellido(uno.nombre)}! ${vuelta(uno.tiempo)}.`
          : `${apellido(uno.nombre)} fue el más rápido, ${vuelta(uno.tiempo)}.`;
      }

      const cola = hueco
        ? esClasificacion(tipo)
          ? `, a ${hueco} de la pole de ${apellido(lider.nombre)}`
          : `, a ${hueco} del más rápido (${apellido(lider.nombre)})`
        : '';

      return esClasificacion(tipo)
        ? `${apellido(uno.nombre)} saldrá ${uno.puesto}.º${cola}.`
        : `${apellido(uno.nombre)} ${uno.puesto}.º${cola}.`;
    }

    const tuyo = mios.some((f) => f.codigo === lider.codigo);

    if (tuyo) {
      fijo = esClasificacion(tipo)
        ? `${apellido(lider.nombre)} se llevó la pole.`
        : `${apellido(lider.nombre)} fue el más rápido.`;
    } else {
      fijo = esClasificacion(tipo)
        ? `Pole para ${apellido(lider.nombre)}.`
        : `Más rápido: ${apellido(lider.nombre)}.`;
    }

    nombrados.add(lider.codigo);
  }

  const pendientes = mios.filter((f) => !nombrados.has(f.codigo)).slice(0, MAXIMO_FAVORITOS);

  if (pendientes.length) {
    trozos.push({
      orden: 1,
      peso: 1,
      texto: `${pendientes.map((f) => `${apellido(f.nombre)} ${situacion(f, tipo)}`).join(', ')}.`,
    });
  }

  let largo = fijo.length;
  const dentro: Trozo[] = [];

  for (const trozo of [...trozos].sort((a, b) => a.peso - b.peso)) {
    if (largo + 1 + trozo.texto.length > LIMITE_CARACTERES) continue;
    largo += 1 + trozo.texto.length;
    dentro.push(trozo);
  }

  return [fijo, ...dentro.sort((a, b) => b.orden - a.orden).map((t) => t.texto)].join(' ');
}

export interface AvisoRedactado {
  titulo: string;
  cuerpo: string;
}

/** El aviso entero: el título con el Gran Premio y el cuerpo ya presupuestado. */
export function redactarAviso(opciones: {
  sesion: Sesion;
  /** El nombre del Gran Premio, tal como lo guarda la base. */
  granPremio: string;
  filas: FilaDeSesion[];
  favoritos: Favorito[];
}): AvisoRedactado {
  const { sesion, granPremio, filas, favoritos } = opciones;

  return {
    titulo: `${sesion.nombre} · ${granPremio}`,
    // El podio solo donde significa algo. En una práctica la noticia es tu
    // piloto, no los tres primeros de una sesión que no reparte nada.
    cuerpo: redactarCuerpo({
      tipo: sesion.tipo,
      filas,
      favoritos,
      podio: esCarrera(sesion.tipo),
    }),
  };
}
