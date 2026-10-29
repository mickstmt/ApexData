/**
 * El registro de novedades: lo que se ha añadido a cada módulo y cómo se
 * enseña la primera vez que alguien entra después del cambio.
 *
 * Añadir una novedad es añadir una entrada aquí y poner la guía en la pantalla
 * del módulo, si aún no la tiene. El componente no se toca. El procedimiento
 * completo está en la skill `anunciar-novedad`.
 *
 * Este archivo no importa nada a propósito: lo leen también la configuración
 * de Playwright, para dar por vistas todas las novedades en las pruebas que no
 * son de la guía, y las pruebas unitarias, que comprueban sus reglas.
 */

export interface PasoDeNovedad {
  /** Único dentro de su novedad. Con él se apunta que el paso ya se vio. */
  id: string;
  /**
   * El elemento que se señala, como selector CSS.
   *
   * Si no está en pantalla cuando toca, el paso se salta: una guía que señala
   * un hueco es peor que ninguna.
   */
  ancla: string;
  titulo: string;
  texto: string;
}

export interface Novedad {
  /** Único en todo el registro. No se cambia una vez publicada. */
  id: string;
  /** El módulo donde sale, el mismo nombre que le pasa su pantalla a la guía. */
  modulo: string;
  /** El día en que salió a producción, `AAAA-MM-DD`. Desde ahí cuenta la caducidad. */
  desde: string;
  /** Uno a tres. Si hacen falta más, eso es una página de cambios y no una guía. */
  pasos: PasoDeNovedad[];
  /**
   * Avisos de antes de que existiera este registro, que guardaban lo visto en
   * su propia clave: si está, el paso ya se vio y no se repite.
   */
  heredados?: Record<string, string>;
}

/**
 * Una novedad deja de salir a los treinta días de publicarse.
 *
 * Para quien entra después, ya no es nueva: es como funciona el módulo.
 */
export const CADUCIDAD_DIAS = 30;

/**
 * Por novedad, y también por visita: si dos novedades del mismo módulo coinciden
 * en el plazo, lo que pase de tres sale en la visita siguiente.
 */
export const MAX_PASOS = 3;

/**
 * Lo que señala la novedad de la calculadora. Lo importa también su pantalla,
 * para avisar de que se ha usado con un atajo de teclado: la guía compara
 * anclas como texto, y dos copias escritas a mano acabarían separándose.
 */
export const ANCLAS_CALCULADORA = {
  fraccion: '[data-tecla="fraccion"]',
  vista: '[data-novedad="vista"]',
} as const;

export const NOVEDADES: Novedad[] = [
  {
    id: 'calculadora-fracciones',
    modulo: 'calculadora',
    desde: '2026-10-27',
    pasos: [
      {
        id: 'tecla',
        ancla: ANCLAS_CALCULADORA.fraccion,
        titulo: 'Nuevo: fracciones exactas',
        texto: 'Escribe el número de arriba, pulsa esta tecla y escribe el de abajo.',
      },
      {
        id: 'vista',
        ancla: ANCLAS_CALCULADORA.vista,
        titulo: 'Fracción o decimal',
        texto: 'Después de «=», este botón pasa el resultado de fracción a decimal y vuelta. Atajo: d.',
      },
    ],
    // El globo de un solo paso que salió con la tecla. Hablaba de la tecla y
    // de pasada del botón; el botón no lo señalaba, así que ese paso sí sale.
    heredados: { tecla: 'apexdata-calculadora-fraccion-vista' },
  },
];
