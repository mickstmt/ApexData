'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Cifra que rueda al cambiar, como un marcador de circuito.
 *
 * Solo se mueven los dígitos que cambian: los demás se quedan quietos, que es
 * lo que distingue esto de animar el número entero y lo que permite seguir
 * leyéndolo mientras rueda.
 *
 * Tres decisiones que conviene no romper:
 *
 * 1. **Nunca anima en el primer pintado.** Que las cifras rueden al abrir una
 *    página no informa de nada: no han cambiado, acaban de llegar.
 * 2. **`tabular-nums`**: si los dígitos no ocupan lo mismo, la cifra se ensancha
 *    y encoge mientras rueda y arrastra a lo que tenga al lado.
 * 3. Con "reducir movimiento" se pinta el número y punto.
 *
 * El detalle que lo hace funcionar: la rueda se pinta **primero en la posición
 * vieja** y solo al fotograma siguiente se manda a la nueva. Puesta de una vez
 * en su destino, el navegador no tiene desde dónde interpolar y el dígito
 * aparece cambiado, sin rodar.
 */

const ALTURA = '1.15em';
const DURACION_MS = 300;
const DIGITOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function RollingNumber({ value, className = '' }: { value: number; className?: string }) {
  const reduceMotion = useReducedMotion();

  /** Dónde están las ruedas ahora mismo. Empieza en el valor: sin animación al montar. */
  const [posicion, setPosicion] = useState(value);
  /**
   * Las ruedas solo existen mientras algo se mueve.
   *
   * Montarlas siempre costaba diez nodos por dígito de forma permanente: en la
   * clasificación eran 770 elementos parados sin hacer nada. En reposo se pinta
   * el número y ya está.
   */
  const [rodando, setRodando] = useState(false);
  const anterior = useRef(value);

  useEffect(() => {
    if (value === anterior.current) return;

    setPosicion(anterior.current);
    setRodando(true);
    anterior.current = value;

    // Dos fotogramas: uno para que el navegador pinte la posición de partida y
    // otro para mandarla al destino, que es cuando la transición arranca.
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPosicion(value));
    });
    const fin = setTimeout(() => setRodando(false), DURACION_MS + 60);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fin);
    };
  }, [value]);

  const destino = String(value);

  if (reduceMotion || !rodando) {
    return <span className={`font-mono tabular-nums ${className}`}>{destino}</span>;
  }

  const actual = String(posicion).padStart(destino.length, '0');

  return (
    <span className={`inline-flex font-mono tabular-nums ${className}`}>
      <span className="sr-only">{destino}</span>

      {destino.split('').map((caracter, indice) => {
        const enPantalla = Number(actual[indice]);

        // Signos y separadores no ruedan.
        if (!/\d/.test(caracter) || Number.isNaN(enPantalla)) {
          return (
            <span key={indice} aria-hidden>
              {caracter}
            </span>
          );
        }

        return (
          <span
            key={indice}
            aria-hidden
            className="inline-flex overflow-hidden"
            style={{ height: ALTURA }}
          >
            <span
              className="block transition-transform ease-out"
              // La duración vive en una constante porque el temporizador que
              // desmonta las ruedas tiene que esperar exactamente lo mismo.
              style={{
                transform: `translateY(calc(${enPantalla} * -${ALTURA}))`,
                transitionDuration: `${DURACION_MS}ms`,
              }}
            >
              {DIGITOS.map((digito) => (
                <span key={digito} className="block" style={{ height: ALTURA }}>
                  {digito}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
