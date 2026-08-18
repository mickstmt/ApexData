'use client';

import { MotionConfig } from 'framer-motion';

/**
 * Respeta la preferencia de "reducir movimiento" del sistema en toda la app.
 *
 * `reducedMotion="user"` hace que framer-motion desactive las animaciones de
 * transformación —desplazamientos, escalados— de cualquier componente `motion`
 * cuando el sistema lo pide, dejando solo los cambios de opacidad, que no
 * producen sensación de movimiento. Es la forma global de cumplir lo que el
 * plan exigía y que no estaba hecho en ningún sitio: sin esto, cada navegación
 * desplazaba la página entera y las listas entraban en cascada, sin escape
 * posible para quien sufre trastorno vestibular.
 *
 * El equivalente para las animaciones escritas en CSS vive en `globals.css`.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}