'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { instanteTras, siguienteVelocidad, type Velocidad } from '@/lib/replay/reloj';

/**
 * El reloj de reproducción, en dos velocidades a la vez.
 *
 * El mapa necesita el instante con decimales sesenta veces por segundo para
 * interpolar; la torre, la píldora y el reloj de pantalla solo cambian cuatro
 * veces por segundo, cuando cambia el instante entero. Si todo fuera estado
 * de React, la torre entera se volvería a pintar en cada fotograma para no
 * cambiar nada. Así que el instante fino vive en una referencia y avisa a
 * quien se suscriba (el canvas), y solo el entero pasa por `useState`.
 */
export interface RelojDeReplay {
  /** El instante con decimales, para el canvas. No provoca renders. */
  kRef: React.MutableRefObject<number>;
  /** El instante entero, para el DOM. */
  kEntero: number;
  reproduciendo: boolean;
  velocidad: Velocidad;
  alternar: () => void;
  cambiarVelocidad: () => void;
  buscar: (k: number) => void;
  /** Se llama en cada fotograma mientras se reproduce, y al buscar. */
  suscribir: (oyente: (k: number) => void) => () => void;
}

export function useRelojDeReplay(count: number, paso: number, inicial = 0): RelojDeReplay {
  const kRef = useRef(inicial);
  const [kEntero, setKEntero] = useState(Math.floor(inicial));
  const [reproduciendo, setReproduciendo] = useState(false);
  const [velocidad, setVelocidad] = useState<Velocidad>(1);
  const oyentes = useRef(new Set<(k: number) => void>());

  /**
   * Desde qué instante y desde qué momento cuenta el bucle.
   *
   * El instante se calcula desde este origen y no sumando fotograma a
   * fotograma, porque la suma acumula el error de cada `requestAnimationFrame`
   * y al cabo de unos minutos el reloj de pantalla y el de la carrera se
   * separan. Y vive en una referencia porque **buscar tiene que poder
   * moverlo**: sin eso, arrastrar el scrubber o saltar diez segundos mientras
   * se reproduce se deshacía solo en el fotograma siguiente, que volvía a
   * calcular desde el origen viejo.
   */
  const origen = useRef({ k: inicial, t: 0 });

  const avisar = useCallback((k: number) => {
    for (const oyente of oyentes.current) oyente(k);
  }, []);

  useEffect(() => {
    if (!reproduciendo) return;

    origen.current = { k: kRef.current, t: performance.now() };
    let ultimoEntero = Math.floor(kRef.current);
    let raf = 0;

    const fotograma = (ahora: number) => {
      const k = instanteTras(origen.current.k, ahora - origen.current.t, velocidad, paso, count);
      kRef.current = k;
      avisar(k);

      const entero = Math.floor(k);
      if (entero !== ultimoEntero) {
        ultimoEntero = entero;
        setKEntero(entero);
      }

      if (k >= count - 1) {
        setReproduciendo(false);
        return;
      }
      raf = requestAnimationFrame(fotograma);
    };

    raf = requestAnimationFrame(fotograma);
    return () => cancelAnimationFrame(raf);
  }, [reproduciendo, velocidad, paso, count, avisar]);

  const buscar = useCallback(
    (k: number) => {
      const acotado = Math.max(0, Math.min(count - 1, k));
      kRef.current = acotado;
      // El origen se mueve con él: si está reproduciendo, el bucle sigue desde
      // aquí en vez de volver a donde estaba.
      origen.current = { k: acotado, t: performance.now() };
      setKEntero(Math.floor(acotado));
      avisar(acotado);
    },
    [count, avisar]
  );

  const alternar = useCallback(() => {
    setReproduciendo((estaba) => {
      // Al final de la carrera, reproducir vuelve al principio.
      if (!estaba && kRef.current >= count - 1) buscar(0);
      return !estaba;
    });
  }, [count, buscar]);

  const cambiarVelocidad = useCallback(() => setVelocidad((v) => siguienteVelocidad(v)), []);

  const suscribir = useCallback((oyente: (k: number) => void) => {
    oyentes.current.add(oyente);
    return () => {
      oyentes.current.delete(oyente);
    };
  }, []);

  return { kRef, kEntero, reproduciendo, velocidad, alternar, cambiarVelocidad, buscar, suscribir };
}
