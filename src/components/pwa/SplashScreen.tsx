'use client';

import { useEffect, useState } from 'react';
import { FORMAS, estiloDeForma } from '@/lib/splash-art';

/**
 * La pantalla de apertura de la app instalada.
 *
 * Tapa el hueco entre la imagen de arranque nativa de iOS y el primer pintado
 * de la app, que hasta ahora eran **tres a cinco segundos de pantalla negra**.
 * Es el mismo planteamiento que en Plastik, con su misma línea de tiempo.
 *
 * Dos decisiones que lo hacen funcionar:
 *
 * 1. **Se pinta en el HTML inicial.** Si esperara a hidratarse llegaría tarde,
 *    que es justo el rato que hay que cubrir.
 * 2. **Fuera de la app instalada no existe**, y no por una comprobación de
 *    JavaScript sino por una regla CSS en `globals.css` que la esconde antes de
 *    que corra nada. En una pestaña normal no hay ni un parpadeo.
 *
 * Se dibuja la misma marca del icono que se acaba de tocar: la línea de carrera
 * trazando la curva, los pianos del ápice y la traza de telemetría saliendo.
 *
 * El fondo —las dos curvas del ápice— es **el mismo que trae la imagen nativa
 * de iOS**, calculado desde `splash-art.ts` para que no haya salto entre una y
 * otra. Y va en el verde de la marca escrito a mano, no en `--primary`: ese
 * token lo reescribe el equipo favorito, y entonces la app y la imagen de
 * arranque dejarían de coincidir. Aquí manda la identidad de ApexData.
 *
 *   0 ms  ──► 700 ms    la línea de carrera se dibuja sola
 *   600 ms ─► 1000 ms   la traza de telemetría, solapando con la anterior
 *   700 ms ─► 900 ms    los tres pianos aparecen escalonados
 *   800 ms ─► 1460 ms   «ApexData» sube letra a letra, cada 60 ms
 *   1900 ms ► 2200 ms   se desvanece entera
 *   2200 ms             se desmonta
 *   3000 ms             desmontaje de seguridad, por si un temporizador se atasca
 *
 * Las animaciones viven en CSS y no aquí para que las lleve la tarjeta gráfica;
 * este componente solo secuencia la salida. Con «reducir movimiento» la regla
 * global las deja en 0,01 ms: la marca aparece entera y quieta, que sigue
 * tapando el negro sin mover nada.
 */

/**
 * El nombre, ya deshecho en letras con su color.
 *
 * Se calcula una vez y fuera del componente: llevar la cuenta del escalonado
 * con una variable mutada durante el render es lo que el compilador de React
 * prohíbe, y con razón.
 */
const LETRAS = [
  { texto: 'Apex', clase: 'text-foreground' },
  { texto: 'Data', clase: 'text-[#526600] dark:text-[#CCFF00]' },
].flatMap(({ texto, clase }) => texto.split('').map((letra) => ({ letra, clase })));

const INICIO_DESVANECIDO_MS = 1900;
const RETIRAR_MS = 2200;
const CORTE_DURO_MS = 3000;

export function SplashScreen() {
  const [oculta, setOculta] = useState(false);
  const [desvaneciendo, setDesvaneciendo] = useState(false);
  /**
   * `?splash` la enseña también en una pestaña normal.
   *
   * No es un truco para pruebas: el modo instalado no se puede emular desde un
   * navegador sin instalar la app —lo intenté por tres caminos y ninguno hace
   * que `(display-mode: standalone)` valga—, así que sin esto la única forma de
   * ver la animación sería en el teléfono, después de desplegar.
   */
  const [forzada, setForzada] = useState(false);

  useEffect(() => {
    const instalada = window.matchMedia('(display-mode: standalone)').matches;
    const pedida = new URLSearchParams(window.location.search).has('splash');

    /**
     * La marca de vida que decide si una carga es apertura o recarga.
     *
     * Se apunta cada cinco segundos **solo con la app a la vista**. El guion del
     * `<head>` la lee en la siguiente carga: si es de hace muy poco, la app no
     * se «abrió» —se recargó a sí misma, normalmente para estrenar una versión—
     * y la animación de apertura no debe sonar otra vez.
     *
     * El primer guardia latía también con la app escondida, y con eso apagó la
     * animación del todo: cerrarla y volver a abrirla enseguida dejaba una marca
     * fresca escrita mientras estaba en segundo plano, así que la apertura de
     * verdad se contaba como recarga. El latido tiene que medir «esta página
     * está delante ahora mismo», no «este navegador tiene la pestaña por ahí».
     */
    const latir = () => {
      if (document.visibilityState !== 'visible') return;

      try {
        localStorage.setItem('apexdata-viva', String(Date.now()));
      } catch {
        // Sin almacenamiento no hay latido, y lo único que pasa es que la
        // animación puede repetirse: exactamente lo que ocurría antes.
      }
    };

    let pulso: number | undefined;

    if (instalada) {
      latir();
      // Cada cinco segundos, no cada quince: la ventana que lee el guion es
      // ahora de diez, y con un latido más lento que la ventana una recarga
      // legítima podría encontrarse la marca ya caducada.
      pulso = window.setInterval(latir, 5_000);
    }

    // Fuera de la app instalada no se programa nada más: la regla CSS ya la
    // esconde, y así tampoco quedan temporizadores sueltos en una pestaña.
    if (!instalada && !pedida) return;

    // El guion del head ya decidió que esto es una recarga: la capa está
    // escondida por CSS desde antes del primer pintado; aquí solo se desmonta
    // sin programar la secuencia.
    if (!pedida && document.documentElement.hasAttribute('data-reapertura')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOculta(true);
      return () => {
        if (pulso) window.clearInterval(pulso);
      };
    }

    if (pedida) setForzada(true);

    const desvanecer = window.setTimeout(() => setDesvaneciendo(true), INICIO_DESVANECIDO_MS);
    const retirar = window.setTimeout(() => setOculta(true), RETIRAR_MS);
    const corte = window.setTimeout(() => setOculta(true), CORTE_DURO_MS);

    return () => {
      window.clearTimeout(desvanecer);
      window.clearTimeout(retirar);
      window.clearTimeout(corte);
      if (pulso) window.clearInterval(pulso);
    };
  }, []);

  if (oculta) return null;

  return (
    <div
      // La regla que la esconde apunta solo al valor `auto`: con `forzada` se
      // ve en cualquier sitio, que es como se puede revisar sin instalar nada.
      data-splash={forzada ? 'forzada' : 'auto'}
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-background transition-opacity duration-300 ease-out ${
        desvaneciendo ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Las dos curvas del ápice, iguales que en la imagen nativa. */}
      {FORMAS.map((forma, indice) => (
        <span
          key={indice}
          aria-hidden
          className="absolute bg-[#526600] dark:bg-[#CCFF00]"
          style={estiloDeForma(forma)}
        />
      ))}

      {/* La marca del icono. `pathLength="1"` en los trazos para que el
          fotograma clave pueda animar `stroke-dashoffset` de 1 a 0 sin saber
          cuánto mide cada camino de verdad. */}
      <svg
        width="112"
        height="112"
        viewBox="0 0 512 512"
        fill="none"
        aria-hidden
        className="relative drop-shadow-sm"
      >
        <path
          d="M96 400 C 96 232, 200 128, 400 112"
          stroke="currentColor"
          strokeWidth="34"
          strokeLinecap="round"
          pathLength="1"
          className="splash-trazo splash-linea text-[#526600] dark:text-[#CCFF00]"
        />

        <g className="text-foreground" fill="currentColor">
          <rect
            x="150"
            y="322"
            width="26"
            height="26"
            rx="4"
            transform="rotate(-38 163 335)"
            className="splash-piano"
            style={{ animationDelay: '700ms' }}
          />
          <rect
            x="186"
            y="278"
            width="26"
            height="26"
            rx="4"
            transform="rotate(-30 199 291)"
            className="splash-piano"
            style={{ animationDelay: '780ms' }}
          />
          <rect
            x="230"
            y="244"
            width="26"
            height="26"
            rx="4"
            transform="rotate(-20 243 257)"
            className="splash-piano"
            style={{ animationDelay: '860ms' }}
          />
        </g>

        <path
          d="M300 356 L340 356 L340 300 L380 300 L380 236 L420 236"
          stroke="currentColor"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          className="splash-trazo splash-traza text-foreground"
        />
      </svg>

      <p className="relative font-display text-3xl font-bold tracking-tight">
        {LETRAS.map(({ letra, clase }, indice) => (
          <span
            key={indice}
            className={`splash-letra inline-block ${clase}`}
            style={{ animationDelay: `${800 + indice * 60}ms` }}
          >
            {letra}
          </span>
        ))}
      </p>
    </div>
  );
}
