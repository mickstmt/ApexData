'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Search } from 'lucide-react';
import { ChipSeleccionable } from '@/components/ui/Chip';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { paisEnEspañol } from '@/lib/countries';

/**
 * La lista de circuitos, con buscador y tres filtros.
 *
 * ## Qué se arregló aquí
 *
 * **La tarjeta decía «0 carreras».** De los 55 circuitos, 19 no tienen ninguna
 * en la base: son trazados de 1955 a 1985 y los resultados arrancan en 2010,
 * así que no las tendrán nunca por esta vía. Un «0» no se lee como historia,
 * se lee como fallo de la app. Ahora dicen **«Solo el trazado»**, que es la
 * verdad, y se agrupan al final bajo su propio encabezado.
 *
 * **El año era un enlace de 84×20 px.** Cada tarjeta llevaba un «última: 2026»
 * apuntando al calendario, con `z-index: 10` **por encima** de la capa que
 * cubre la tarjeta entera: un toque impreciso te sacaba de los circuitos. Eran
 * 36, todos por debajo del mínimo de 44 px del proyecto. Ahora el año es texto
 * y la tarjeta tiene un solo destino.
 *
 * **La tarjeta medía 250 px** con el trazado en una banda de 144. En fila mide
 * **100**, y la lista pasa de 18,7 pantallas a 7,3. El dibujo baja de 112 a 64
 * px: deja de ser el cuadro de la pantalla para ser lo que de verdad hace, que
 * es identificar el circuito de un vistazo.
 *
 * ## Por qué no hay selector de país
 *
 * Es el filtro que usan `/drivers` y `/constructors`, pero aquí no traslada:
 * hay **34 países para 55 circuitos**, o sea 1,6 por país, así que casi toda
 * opción deja una lista de una tarjeta. Es un índice uno a uno disfrazado de
 * filtro. El buscador cubre lo mismo escribiendo tres letras — y busca también
 * por ciudad y por país, porque los nombres de la base son formales
 * («Autodromo Nazionale di Monza») y nadie escribe eso.
 */

export interface CircuitoDeLaLista {
  id: string;
  circuitId: string;
  name: string;
  location: string;
  country: string;
  imageUrl: string | null;
  races: number;
  lastYear: number | null;
}

/** Desde qué año se considera que un circuito sigue en el calendario. */
const TEMPORADA_RECIENTE = 2024;

type Filtro = 'actuales' | 'historicos' | 'todos';

/** Sin tildes ni mayúsculas: buscar «mexico» debe encontrar «México». */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function Tarjeta({ circuito }: { circuito: CircuitoDeLaLista }) {
  const sinCarreras = circuito.races === 0;

  return (
    // `min-w-0` en la propia tarjeta y no solo en el bloque de texto: como
    // elemento de rejilla su mínimo es `auto`, así que la pista crecía hasta el
    // ancho del nombre más largo y la lista se salía 27 px de la pantalla. El
    // `truncate` de dentro no puede hacer nada si quien lo contiene no encoge.
    <li className="relative flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card p-3 transition-colors focus-within:border-primary hover:border-primary">
      <span
        className={`flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-md bg-muted/40 ${
          sinCarreras ? 'opacity-60' : ''
        }`}
      >
        {circuito.imageUrl ? (
          <Image
            src={circuito.imageUrl}
            alt=""
            width={128}
            height={128}
            // Los archivos traen la tinta fija —23 de 36 en blanco y el resto en
            // negro—, así que se fuerzan a silueta monocroma como los logos.
            className="h-16 w-auto object-contain opacity-90 brightness-0 dark:brightness-0 dark:invert"
          />
        ) : (
          <MapPin className="h-6 w-6 text-muted-foreground/40" aria-hidden />
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          href={`/circuits/${circuito.circuitId}`}
          // Un solo enlace estirado sobre la tarjeta entera: el objetivo táctil
          // es la tarjeta —100 px de alto— y no un renglón de texto.
          className="truncate font-semibold after:absolute after:inset-0 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {circuito.name}
        </Link>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <CountryFlag country={circuito.country} size={14} />
          <span className="truncate">{circuito.location}</span>
        </span>
        {sinCarreras ? (
          <span className="text-xs italic text-muted-foreground/80">Solo el trazado</span>
        ) : (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {circuito.races} {circuito.races === 1 ? 'carrera' : 'carreras'} · última{' '}
            {circuito.lastYear}
          </span>
        )}
      </span>
    </li>
  );
}

export function BuscadorDeCircuitos({ circuitos }: { circuitos: CircuitoDeLaLista[] }) {
  const [consulta, setConsulta] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const actuales = useMemo(
    () => circuitos.filter((c) => (c.lastYear ?? 0) >= TEMPORADA_RECIENTE).length,
    [circuitos]
  );

  const visibles = useMemo(() => {
    const busca = normalizar(consulta.trim());

    return circuitos.filter((c) => {
      const reciente = (c.lastYear ?? 0) >= TEMPORADA_RECIENTE;
      if (filtro === 'actuales' && !reciente) return false;
      if (filtro === 'historicos' && reciente) return false;

      if (!busca) return true;

      // Nombre, ciudad y país —en los dos idiomas—: los nombres de la base son
      // formales y nadie escribe «Autodromo Nazionale di Monza».
      return [c.name, c.location, c.country, paisEnEspañol(c.country)].some((campo) =>
        normalizar(campo).includes(busca)
      );
    });
  }, [circuitos, consulta, filtro]);

  // Los que no tienen ni una carrera van al final, bajo su propio encabezado:
  // ya estaban ahí por el orden, pero sin decir por qué.
  const conDatos = visibles.filter((c) => c.races > 0);
  const soloTrazado = visibles.filter((c) => c.races === 0);

  return (
    <>
      <div className="mb-6">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Buscar circuito, ciudad o país"
            aria-label="Buscar circuito, ciudad o país"
            // `min-h-11` y no el `py-2` de los otros buscadores: aquéllos miden
            // 42 px, por debajo del mínimo táctil que el proyecto se fijó.
            className="min-h-11 w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-base ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
          />
        </div>

        <div className="mt-3 flex gap-2">
          {(
            [
              ['actuales', 'Actuales', actuales],
              ['historicos', 'Históricos', circuitos.length - actuales],
              ['todos', 'Todos', circuitos.length],
            ] as const
          ).map(([clave, texto, cuantos]) => (
            <ChipSeleccionable
              key={clave}
              elegido={filtro === clave}
              onClick={() => setFiltro(clave)}
              className="flex-1 justify-center px-2"
            >
              {texto} <span className="font-mono text-xs tabular-nums">{cuantos}</span>
            </ChipSeleccionable>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Ningún circuito coincide con «{consulta}».
        </p>
      ) : (
        <>
          <ul className="grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {conDatos.map((c) => (
              <Tarjeta key={c.id} circuito={c} />
            ))}
          </ul>

          {soloTrazado.length > 0 && (
            <>
              <h2 className="mb-2 mt-6 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
                <span>Ya no se corre aquí</span>
                <span className="font-mono text-xs tabular-nums">
                  {soloTrazado.length} {soloTrazado.length === 1 ? 'trazado' : 'trazados'}
                </span>
              </h2>
              <ul className="grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {soloTrazado.map((c) => (
                  <Tarjeta key={c.id} circuito={c} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  );
}
