import type { SVGProps } from 'react';

/**
 * Los iconos que `lucide` no tiene y este deporte sí.
 *
 * La barra inferior llevaba iconos genéricos —una silueta de personas para
 * «Pilotos», una corona para «Clasificación»— y el usuario lo dijo claro: no
 * tienen nada que ver con la Fórmula 1, y un casco hubiera sido muchísimo
 * mejor. Tenía razón: en una app de un deporte concreto, el icono es la mitad
 * de lo que hace que se reconozca sin leer.
 *
 * Se dibujan aquí porque `lucide-react` —el juego que usa el resto de la app—
 * no trae casco de carreras ni bandera a cuadros. Van con su misma rejilla de
 * 24×24, el mismo grosor de trazo y `currentColor`, para que puedan mezclarse
 * con los suyos sin que se note el salto.
 */

type Props = SVGProps<SVGSVGElement>;

const BASE: Props = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

/**
 * Casco de piloto: cúpula, visera y las dos cintas de la barbilla.
 *
 * La visera es lo que lo separa de «una cabeza»: sin ella, a 22 px se lee como
 * un círculo.
 */
export function Casco(props: Props) {
  return (
    <svg {...BASE} {...props}>
      <path d="M20.5 12.2c0 1.4-.3 2.7-.9 3.9-.3.6-.9 1-1.6 1H6c-.7 0-1.3-.4-1.6-1a8.7 8.7 0 0 1-.9-3.9C3.5 7.4 7.3 3.6 12 3.6s8.5 3.8 8.5 8.6Z" />
      <path d="M4.6 12.6c1.8-1.7 4.3-2.6 7.4-2.6 3 0 5.5.9 7.4 2.6" />
      <path d="M9 17.1v2.3M15 17.1v2.3" />
    </svg>
  );
}

/**
 * Bandera a cuadros.
 *
 * Los cuadros van rellenos y no dibujados a trazo: a 22 px una rejilla de
 * líneas se convierte en una mancha, y lo que hace reconocible esta bandera es
 * justo el damero.
 */
export function BanderaCuadros(props: Props) {
  return (
    <svg {...BASE} {...props}>
      <path d="M4.6 3.2v17.6" />
      <path d="M4.6 4.6h15v8.6h-15z" />
      <g fill="currentColor" stroke="none">
        <path d="M4.6 4.6h3.7v2.9H4.6zM12.1 4.6h3.7v2.9h-3.7z" />
        <path d="M8.3 7.5h3.8v2.9H8.3zM15.8 7.5h3.8v2.9h-3.8z" />
        <path d="M4.6 10.4h3.7v2.8H4.6zM12.1 10.4h3.7v2.8h-3.7z" />
      </g>
    </svg>
  );
}

/**
 * Podio: tres cajones, el del centro más alto.
 *
 * Sustituye a la copa. Una copa es de cualquier deporte; un podio de tres
 * escalones con el primero en medio es la imagen con la que termina cada
 * domingo.
 */
export function Podio(props: Props) {
  return (
    <svg {...BASE} {...props}>
      <path d="M3 20.5h18" />
      <path d="M4.4 13.6h4.8v6.9H4.4z" />
      <path d="M9.6 9.2h4.8v11.3H9.6z" />
      <path d="M14.8 15.6h4.8v4.9h-4.8z" />
    </svg>
  );
}
