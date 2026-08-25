/**
 * Los coches de la parrilla, y quién tiene uno.
 *
 * Las imágenes las prepara `scripts/images/cars.ts`: recorta cada archivo a su
 * caja real y lo remonta sobre un lienzo idéntico con las ruedas apoyadas en la
 * misma línea —venían con entre un 21 % y un 32 % de aire, y puestos en fila
 * unos se dibujaban más pequeños que otros—, y de paso los convierte a AVIF y
 * WebP: de 284 KB en PNG a 21 KB.
 *
 * ## Por qué una lista escrita y no leer la carpeta
 *
 * La base guarda unas cuarenta escuderías, entre actuales e históricas, y solo
 * once tienen coche. Preguntar por el archivo en cada pintado obligaría a tocar
 * el disco desde un componente; declararlo aquí es una línea por temporada y
 * hace explícito lo que de verdad importa: **quién NO tiene**, para que su
 * ausencia sea una decisión y no un hueco.
 */

/** La temporada de la que son las imágenes. Va en el nombre del archivo. */
export const TEMPORADA_DE_LOS_COCHES = 2026;

/**
 * Las escuderías con imagen de coche.
 *
 * Al cambiar de temporada: volver a ejecutar el guion con los archivos nuevos,
 * subir el año de arriba y ajustar esta lista. Lo que no esté aquí sigue
 * funcionando —la banda simplemente no se dibuja— y esa es la razón de que la
 * lista sea explícita.
 */
const CON_COCHE = new Set([
  'alpine',
  'aston_martin',
  'audi',
  'cadillac',
  'ferrari',
  'haas',
  'mclaren',
  'mercedes',
  'rb',
  'red_bull',
  'williams',
]);

export interface CocheDeEquipo {
  /** Los dos anchos servidos, en los dos formatos. */
  avif: { estrecho: string; ancho: string };
  webp: { estrecho: string; ancho: string };
  /** Las medidas del lienzo, para reservar el hueco y no dar un salto al cargar. */
  ancho: number;
  alto: number;
}

/** Las medidas del lienzo común. Idénticas en los once. */
const LIENZO = { ancho: 1034, alto: 298 };

export function cocheDe(constructorId: string | null | undefined): CocheDeEquipo | null {
  if (!constructorId || !CON_COCHE.has(constructorId)) return null;

  const base = `/images/cars/${constructorId}-${TEMPORADA_DE_LOS_COCHES}`;

  return {
    avif: { estrecho: `${base}@517.avif`, ancho: `${base}.avif` },
    webp: { estrecho: `${base}@517.webp`, ancho: `${base}.webp` },
    ancho: LIENZO.ancho,
    alto: LIENZO.alto,
  };
}
