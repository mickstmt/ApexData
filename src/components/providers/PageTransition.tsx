'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  // Esta transición mueve la página ENTERA en cada navegación, así que es la
  // que más molesta a quien tiene activado "reducir movimiento". El
  // `MotionConfig` global no basta aquí: se comprobó en un navegador real y el
  // desplazamiento seguía aplicándose, así que el salto se anula a mano y solo
  // queda el fundido, que no produce sensación de movimiento.
  const reduceMotion = useReducedMotion();
  const offset = reduceMotion ? 0 : 20;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: offset }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -offset }}
        transition={{
          // Con movimiento reducido la salida también se acorta: los 300 ms de
          // esta animación retrasaban la aparición de todos los esqueletos.
          duration: reduceMotion ? 0.1 : 0.3,
          ease: 'easeInOut',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}