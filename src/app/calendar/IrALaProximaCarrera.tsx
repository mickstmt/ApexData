'use client';

import { useEffect } from 'react';

/**
 * Al abrir el calendario, llevar la vista al gran premio que viene.
 *
 * Sin esto la página abría por la ronda 1 —en agosto, un gran premio de marzo
 * que terminó hace medio año— y había que arrastrar toda la temporada para
 * llegar a lo único que se suele venir a mirar.
 *
 * Cuál es «el que viene» se decide **en el navegador**, no en el servidor: la
 * página se sirve cacheada, así que una respuesta guardada en marzo seguiría
 * señalando la ronda 1 en agosto. Es el mismo motivo por el que la tira de
 * sesiones de la portada reparte sus estados después de montar.
 *
 * Una carrera cuenta como «en curso» durante todo su día. El campo `date` trae
 * la fecha, no siempre la hora buena, y saltarse el domingo por la mañana para
 * señalar la carrera siguiente sería justo lo contrario de lo que se busca.
 *
 * La temporada entra como prop para que el efecto no dependa de si el
 * componente vuelve a montarse. Medido: hoy **sí** se monta de nuevo al cambiar
 * de temporada con el selector —que navega a `?season=…`, la misma ruta— y con
 * las dependencias vacías también funcionaba. Pero eso es un detalle de cómo
 * Next reconcilia un segmento cuando cambian sus `searchParams`, no algo que
 * este componente pueda dar por bueno; atarlo a la temporada lo hace cierto por
 * construcción y no por suerte.
 */
export function IrALaProximaCarrera({ temporada }: { temporada: number }) {
  useEffect(() => {
    const tarjetas = Array.from(document.querySelectorAll<HTMLElement>('[data-fecha]'));

    // Se borra lo marcado antes de marcar. Al cambiar de temporada React reusa
    // los mismos nodos —el `className` que él controla no ha cambiado—, así que
    // una marca puesta a mano se quedaría pegada sobre la carrera equivocada.
    for (const tarjeta of tarjetas) {
      tarjeta.classList.remove('border-primary', 'bg-primary/5');
    }

    const ahora = Date.now();
    const UN_DIA = 24 * 60 * 60 * 1000;
    const objetivo = tarjetas.find((tarjeta) => {
      const fecha = Date.parse(tarjeta.dataset.fecha ?? '');
      return !Number.isNaN(fecha) && ahora < fecha + UN_DIA;
    });

    // Una temporada terminada —o una pasada, que es el caso normal— no tiene
    // ninguna por venir. Ahí no se toca nada y la página abre por el principio.
    if (!objetivo) return;

    // Se marca como se marca el día de hoy, con las mismas clases: aterrizar a
    // mitad de una lista sin que nada explique por qué es más desconcertante
    // que haber tenido que arrastrar.
    objetivo.classList.add('border-primary', 'bg-primary/5');

    // Si ya se ve, no se mueve nada: al principio de temporada el que viene es
    // de los primeros, y desplazarse escondería el título de la página.
    const sitio = objetivo.getBoundingClientRect();
    if (sitio.top >= 0 && sitio.top < window.innerHeight * 0.6) return;

    // Y si se llega de vuelta con el navegador, la posición ya la restauró él;
    // robársela sería el mismo atropello que arreglar esto venía a evitar.
    if (window.scrollY > 10) return;

    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // `center` y no `start` por el encabezado, que es fijo y taparía el borde
    // de arriba de la tarjeta.
    objetivo.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'center' });
  }, [temporada]);

  return null;
}
