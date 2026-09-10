import type { ReactNode } from 'react';

/**
 * `<ViewTransition>` existe en tiempo de ejecución pero no en los tipos.
 *
 * El App Router no usa el `react` de la raíz —19.2.0— sino el que Next trae
 * dentro, `19.3.0-canary`, que es el que exporta este componente. Los tipos, en
 * cambio, se resuelven contra el de la raíz, así que TypeScript no lo conoce y
 * el import falla aunque el navegador lo tenga.
 *
 * Comprobado antes de escribir esto:
 *
 * ```
 * require('react').ViewTransition                     -> no existe
 * require('next/dist/compiled/react').ViewTransition  -> existe (19.3.0-canary)
 * ```
 *
 * Esta declaración cuenta esa verdad en vez de esconderla con un `any`. Se
 * borra el día que React 19.3 salga estable y `@types/react` lo declare solo;
 * si para entonces sigue aquí, no rompe nada — solo sobra.
 */
declare module 'react' {
  /**
   * Mapa de tipo de transición a nombre de clase, o un nombre suelto.
   *
   * Los tipos los pone cada enlace con `transitionTypes`, y `default` decide
   * qué pasa con lo que no lleva ninguno: el retroceso del navegador, un
   * `router.refresh()` o la aparición de un `<Suspense>`.
   */
  type NombreDeTransicion = string | Record<string, string>;

  /**
   * Etiqueta la transición en curso, para lo que no es un `<Link>`.
   *
   * `transitionTypes` cubre los enlaces; esto cubre el botón «volver», que no
   * navega con un enlace sino retrocediendo en el historial.
   */
  export function addTransitionType(tipo: string): void;

  export const ViewTransition: (props: {
    children: ReactNode;
    name?: string;
    enter?: NombreDeTransicion;
    exit?: NombreDeTransicion;
    update?: NombreDeTransicion;
    share?: NombreDeTransicion;
    default?: string;
  }) => ReactNode;
}
