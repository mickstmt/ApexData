'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  /**
   * Al retroceder, esta transición sobra: iOS ya trae la suya.
   *
   * El gesto de deslizar desde el borde arrastra la pantalla anterior a la
   * vista con su propia animación nativa. Cuando terminaba, **encima** se
   * ejecutaba el fundido de aquí: el contenido que ya estaba puesto se iba a
   * opacidad cero y volvía. Visto de cerca parece que la página se recarga —que
   * es la palabra que usó el usuario— y por eso solo ocurría con el gesto: con
   * los botones de la app el fundido es la única animación, y es la que se
   * diseñó a propósito.
   *
   * El aviso de contenido fresco del worker era **otra** causa del mismo
   * síntoma, arreglada el 2026-08-22 (entrada 22); esta es la que quedaba.
   *
   * `popstate` cubre las dos formas de retroceder —el gesto y el botón del
   * navegador—, que es lo correcto: en las dos el navegador pone de su parte.
   *
   * Se guarda **a dónde** se retrocedió, no un simple sí/no. Así la marca se
   * apaga sola: en cuanto la dirección deja de ser esa —porque se navegó a otro
   * sitio con un enlace— vuelve a valer la transición de siempre, sin tener que
   * reiniciar nada desde un efecto.
   */
  const [destinoDeVuelta, setDestinoDeVuelta] = useState<string | null>(null);

  useEffect(() => {
    // `popstate` llega con la dirección ya cambiada, así que esto es el destino.
    const alVolver = () => setDestinoDeVuelta(window.location.pathname);
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, []);

  const volviendo = destinoDeVuelta === pathname;

  // Esta transición mueve la página ENTERA en cada navegación, así que es la
  // que más molesta a quien tiene activado "reducir movimiento". El
  // `MotionConfig` global no basta aquí: se comprobó en un navegador real y el
  // desplazamiento seguía aplicándose, así que el salto se anula a mano y solo
  // queda el fundido, que no produce sensación de movimiento.
  const reduceMotion = useReducedMotion();
  const offset = reduceMotion ? 0 : 20;

  return (
    /*
     * La salida va por `custom`, y no por un `exit` escrito aquí, por un
     * motivo concreto que costó una medición: la página que **se va** conserva
     * las props que tenía en su último render, y ese render ocurrió antes del
     * `popstate`. Con `exit` normal seguía desvaneciéndose aunque la que entra
     * ya supiera que se está retrocediendo — medido: la opacidad bajaba a
     * 0,005. `AnimatePresence` relee `custom` en el momento de retirar el
     * elemento, que es exactamente para lo que existe.
     */
    <AnimatePresence mode="wait" custom={volviendo}>
      <motion.div
        key={pathname}
        custom={volviendo}
        // `data-pagina` no es decorativo: es lo que deja comprobar desde una
        // prueba de navegador que al retroceder la opacidad no baja de 1.
        data-pagina={volviendo ? 'sin-transicion' : 'con-transicion'}
        variants={{
          entrada: { opacity: 0, y: offset },
          visible: { opacity: 1, y: 0 },
          // Quieta: si se retrocede, la página se va tal cual estaba. Da igual
          // cuánto dure una animación que no mueve nada.
          salida: (retrocediendo: boolean) =>
            retrocediendo ? { opacity: 1, y: 0 } : { opacity: 0, y: -offset },
        }}
        initial={volviendo ? false : 'entrada'}
        animate="visible"
        exit="salida"
        transition={{
          // Con movimiento reducido la salida también se acorta: los 300 ms de
          // esta animación retrasaban la aparición de todos los esqueletos.
          duration: volviendo ? 0 : reduceMotion ? 0.1 : 0.3,
          ease: 'easeInOut',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}