/**
 * Prepara las imágenes de los coches para servirlas.
 *
 * A diferencia de los otros guiones de `scripts/images/`, este no descarga
 * nada: parte de los PNG que aporta el usuario y hace dos trabajos que no se
 * pueden saltar.
 *
 * ## 1. Normalizar el encuadre
 *
 * Los archivos vienen con el mismo lienzo (1034×298) pero con **distinto aire
 * alrededor del coche**: medido, entre un 21 % y un 32 %. Puestos uno al lado
 * del otro, un coche se dibuja visiblemente más pequeño que el de al lado, y
 * eso no se lee como variedad sino como error.
 *
 * Se recorta cada uno a su caja real —los píxeles que no son transparentes— y
 * se vuelve a montar sobre un lienzo idéntico, con **las ruedas apoyadas
 * siempre en la misma línea**. Sin esto, uno flota y otro se apoya.
 *
 * ## 2. Convertir, porque el PNG no se sirve
 *
 * Los originales pesan ~284 KB cada uno, 3,1 MB en total. Medido con este mismo
 * `sharp`: en AVIF de calidad 60 y esfuerzo 6 bajan a ~27 KB —un 90 % menos— sin
 * daño visible en la librea. Se genera también WebP como respaldo, porque AVIF
 * con transparencia depende del navegador.
 *
 * No se usa `next/image`: su caché vive dentro de la imagen de Docker y se
 * borra en cada despliegue, así que el primer visitante pagaría la conversión
 * de las once en la CPU del VPS. Y Next codifica AVIF con esfuerzo 3, o sea más
 * peso por más trabajo del servidor. Aquí se convierten una vez, a mano, cuando
 * cambie la parrilla. Es la misma decisión que ya se tomó con los trazados de
 * circuito y con los logos.
 *
 * Uso:
 *   npx tsx scripts/images/cars.ts "c:/ruta/a/f1 cars" 2026
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

/**
 * De nombre de archivo a identificador de escudería.
 *
 * Explícito y no derivado del nombre: los archivos vienen como `redbull` y
 * `astonmartin`, y en la base son `red_bull` y `aston_martin`. Una
 * transformación automática acertaría en nueve y fallaría en dos, que es la
 * peor clase de acierto.
 */
const EQUIPOS: Record<string, string> = {
  alpine: 'alpine',
  astonmartin: 'aston_martin',
  audi: 'audi',
  cadillac: 'cadillac',
  ferrari: 'ferrari',
  haas: 'haas',
  mclaren: 'mclaren',
  mercedes: 'mercedes',
  rb: 'rb',
  redbull: 'red_bull',
  williams: 'williams',
};

/** El lienzo común. Misma proporción que los originales, para no deformar. */
const LIENZO = { ancho: 1034, alto: 298 };

/** Aire alrededor del coche, en tanto por uno del lienzo. */
const AIRE = 0.04;

/** Los anchos que se sirven: uno para móvil y rejillas, otro para la ficha. */
const ANCHOS = [517, 1034];

const DESTINO = 'public/images/cars';

async function normalizar(origen: string) {
  // `trim` recorta el borde transparente; así el coche queda pegado a su caja
  // real y todos parten de la misma referencia.
  const recortado = await sharp(origen).trim({ threshold: 1 }).toBuffer();
  const { width = 1, height = 1 } = await sharp(recortado).metadata();

  const dentro = {
    ancho: Math.round(LIENZO.ancho * (1 - AIRE * 2)),
    alto: Math.round(LIENZO.alto * (1 - AIRE * 2)),
  };

  // Se escala para caber entero, sin recortar: un coche de F1 se distingue de
  // otro por el morro y el alerón trasero, así que cortarlo por los lados lo
  // convertiría en un trozo de librea igual al de los demás.
  const escala = Math.min(dentro.ancho / width, dentro.alto / height);
  const destino = { ancho: Math.round(width * escala), alto: Math.round(height * escala) };

  const coche = await sharp(recortado)
    .resize(destino.ancho, destino.alto, { fit: 'fill' })
    .toBuffer();

  // Centrado a lo ancho y **apoyado abajo**: las ruedas de los once quedan en
  // la misma línea, que es lo que hace que una fila de coches se lea como una
  // fila y no como una colección de recortes.
  return sharp({
    create: {
      width: LIENZO.ancho,
      height: LIENZO.alto,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: coche,
        left: Math.round((LIENZO.ancho - destino.ancho) / 2),
        top: LIENZO.alto - destino.alto - Math.round(LIENZO.alto * AIRE),
      },
    ])
    .png()
    .toBuffer();
}

async function main() {
  const origen = process.argv[2];
  const anio = process.argv[3] ?? String(new Date().getFullYear());

  if (!origen) {
    console.error('Uso: npx tsx scripts/images/cars.ts "<carpeta con los PNG>" [año]');
    process.exit(1);
  }

  mkdirSync(DESTINO, { recursive: true });

  const archivos = readdirSync(origen).filter((f) => /\.png$/i.test(f));
  let pesoOriginal = 0;
  let pesoFinal = 0;
  const hechos: string[] = [];

  for (const archivo of archivos) {
    const clave = archivo.replace(/-coche\.png$/i, '').replace(/\.png$/i, '').toLowerCase();
    const equipo = EQUIPOS[clave];

    if (!equipo) {
      console.warn(`   ⚠️  ${archivo}: no sé a qué escudería corresponde; se salta.`);
      continue;
    }

    const ruta = join(origen, archivo);
    pesoOriginal += readFileSync(ruta).length;

    const limpio = await normalizar(ruta);

    for (const ancho of ANCHOS) {
      const sufijo = ancho === Math.max(...ANCHOS) ? '' : `@${ancho}`;
      const base = `${equipo}-${anio}${sufijo}`;

      // El año va en el nombre para que el archivo sea inmutable: así se puede
      // cachear para siempre y una parrilla nueva no pisa a la anterior.
      const avif = await sharp(limpio)
        .resize(ancho)
        .avif({ quality: 60, effort: 6 })
        .toBuffer();
      const webp = await sharp(limpio).resize(ancho).webp({ quality: 82, effort: 6 }).toBuffer();

      writeFileSync(join(DESTINO, `${base}.avif`), avif);
      writeFileSync(join(DESTINO, `${base}.webp`), webp);
      pesoFinal += avif.length + webp.length;
    }

    hechos.push(equipo);
    console.log(`   ✅ ${equipo}`);
  }

  const kb = (n: number) => `${Math.round(n / 1024)} KB`;
  console.log(`\n   ${hechos.length} escuderías · ${kb(pesoOriginal)} de PNG → ${kb(pesoFinal)} servibles`);
  console.log(`   Guardadas en ${DESTINO}/`);
}

main();
