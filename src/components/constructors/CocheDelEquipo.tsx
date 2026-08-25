import { cocheDe } from '@/lib/coches';

/**
 * El coche de una escudería, como banda.
 *
 * La proporción es 3,47:1 —un perfil lateral completo—, así que solo cabe como
 * franja ancha. **Nunca recortado**: un coche de 2026 se distingue de otro por
 * el morro y por el alerón trasero; la zona central es casi idéntica en los
 * once. Cortarlo por los lados lo convierte en un trozo de librea igual al de
 * los demás, y deja de informar.
 *
 * ## Por qué `<picture>` a mano y no `next/image`
 *
 * La misma razón que los trazados de circuito y los logos, más una propia y
 * medida: la caché del optimizador vive dentro de la imagen de Docker, y
 * EasyPanel la reconstruye en cada despliegue. El primer visitante después de
 * cada subida pagaría la conversión de las once en la CPU del VPS. Además Next
 * codifica AVIF con esfuerzo 3, o sea más peso por más trabajo. Aquí ya vienen
 * convertidas de antemano: 21 KB por coche en lugar de 284.
 *
 * AVIF primero y WebP de respaldo, porque AVIF con transparencia no está en
 * todos los navegadores y la transparencia es justo lo que hace que el coche se
 * apoye sobre la tarjeta sin traer su propio fondo.
 */
export function CocheDelEquipo({
  constructorId,
  prioritario = false,
  className = '',
}: {
  constructorId: string | null | undefined;
  /**
   * Cierto solo donde el coche es lo primero que se ve —la ficha del equipo—.
   * En una rejilla de once, cargarlos todos de golpe sería descargar diez
   * imágenes que nadie está mirando.
   */
  prioritario?: boolean;
  className?: string;
}) {
  const coche = cocheDe(constructorId);

  // Sin coche no se dibuja nada, y esa es la decisión: una caja gris de «imagen
  // no disponible» para un recurso decorativo es peor que su ausencia. De las
  // ~40 escuderías de la base solo once tienen imagen.
  if (!coche) return null;

  return (
    <div
      className={`w-full ${className}`}
      // El hueco se reserva antes de que llegue la imagen. Sin esto, once
      // bandas cargando en diferido son once saltos de maquetación mientras se
      // baja por la rejilla.
      style={{ aspectRatio: `${coche.ancho} / ${coche.alto}` }}
    >
      <picture>
        <source
          type="image/avif"
          srcSet={`${coche.avif.estrecho} 517w, ${coche.avif.ancho} 1034w`}
          sizes="(min-width: 1024px) 33vw, 100vw"
        />
        <source
          type="image/webp"
          srcSet={`${coche.webp.estrecho} 517w, ${coche.webp.ancho} 1034w`}
          sizes="(min-width: 1024px) 33vw, 100vw"
        />
        {/* `alt=""`: el nombre del equipo va escrito justo al lado en las dos
            pantallas donde esto aparece, así que un texto alternativo lo haría
            sonar dos veces seguidas en un lector de pantalla. Es el mismo
            criterio que ya sigue el logo.
            eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coche.webp.ancho}
          alt=""
          width={coche.ancho}
          height={coche.alto}
          loading={prioritario ? 'eager' : 'lazy'}
          fetchPriority={prioritario ? 'high' : undefined}
          decoding="async"
          className="h-full w-full object-contain"
        />
      </picture>
    </div>
  );
}
