import Link from 'next/link';

import { CountryFlag } from '@/components/ui/CountryFlag';
import { DriverAvatar } from '@/components/ui/OptimizedImage';
import { contrastBetween, teamColor } from '@/lib/team-colors';
import { cn } from '@/lib/utils';

/**
 * La fila y la tarjeta que comparten las cuatro tablas de la app.
 *
 * ## Por qué existe
 *
 * Carrera, clasificación de sesión, prácticas y campeonato enseñaban lo mismo
 * —una lista ordenada de pilotos— con cuatro maquetaciones distintas, escritas
 * en momentos distintos: una tabla HTML de siete columnas, fichas en dos
 * columnas sin cabeceras, y tarjetas altas con medallas de emoji. El usuario lo
 * resumió: «las tablas no se parecen entre sí, y las prácticas son bastante
 * pobres para todos los dispositivos» (punto 46).
 *
 * Había ya una fila compartida, `TimingRow`, y ninguna de las cuatro la usaba.
 * Esta la sustituye y sí las usa las cuatro.
 *
 * ## Qué lleva siempre, decidido con el usuario sobre maqueta
 *
 * Posición · barra del color del equipo · **dorsal** · **foto** · **bandera del
 * piloto** · nombre completo · **bandera de la escudería** · escudería. Los
 * cuatro datos de en medio no compiten entre sí: «son indispensables», y lo
 * son —el dorsal es como se sigue a un coche en pantalla, la bandera es de lo
 * primero que se busca en un piloto nuevo—.
 *
 * ## Por qué el piloto va en dos líneas
 *
 * Porque en una sola no caben. La columna de contenido mide **672 px** en un
 * monitor (medido en producción tras el punto 47), y con el dorsal en columna
 * propia a la celda del piloto le quedan unos 230: «Andrea Kimi Antonelli» con
 * foto y bandera delante no entra. En dos líneas entra con holgura y la
 * escudería recupera su bandera, que antes no se enseñaba en ningún sitio
 * pese a estar en la base desde siempre.
 *
 * El precio son 6 px por fila (52 → 58). En una carrera de veinte son 120 px
 * de página, y a cambio ninguna tabla pierde un dato.
 */

/** El reparto de columnas de ESTA tabla, que la cabecera y las filas comparten. */
function estilo(rejilla: string) {
  return { ['--rejilla' as string]: rejilla } as React.CSSProperties;
}

export function TarjetaDeTabla({
  titulo,
  contexto,
  nota,
  columnas,
  rejilla,
  children,
}: {
  titulo: string;
  /** Lo que sitúa a la tabla: «GP de España · 57 vueltas», «Tras la ronda 14». */
  contexto?: string;
  /** Una advertencia sobre lo que se está mirando. Solo las prácticas la usan. */
  nota?: string;
  /**
   * Los nombres de las columnas propias de esta sesión, de izquierda a derecha.
   * Las cuatro de siempre —posición, dorsal, piloto— las pone la tarjeta.
   */
  columnas: string[];
  /**
   * `grid-template-columns` para el escritorio, contando TODAS las columnas:
   * posición, barra, dorsal, piloto y las propias.
   */
  rejilla: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-card"
      style={estilo(rejilla)}
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
        <h3 className="font-display text-base font-bold">{titulo}</h3>
        {contexto && (
          <p className="whitespace-nowrap font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
            {contexto}
          </p>
        )}
      </div>

      {nota && (
        <p className="border-b border-border bg-primary/[0.07] px-4 py-2.5 text-[12.5px] text-muted-foreground">
          {nota}
        </p>
      )}

      {/* Sigue siendo una tabla para quien no la ve.
          
          La maquetación es una rejilla y no un `<table>` —un `display: grid`
          sobre elementos de tabla les quita su papel en Chrome, que es la
          trampa clásica de este patrón—, así que el papel se declara a mano.
          Sin esto, lo que era una tabla con cabeceras asociadas pasaría a ser
          una lista de textos sueltos: la prueba de accesibilidad que ya
          existía lo cazó al primer intento.

          La fila de cabeceras solo se pinta en escritorio, que es donde hay
          columnas; en el móvil la fila se parte en dos y los rótulos no
          encajarían sobre nada. */}
      <div role="table" aria-label={titulo}>
        <div
          role="row"
          className="hidden h-8 items-center gap-2.5 border-b border-border px-3.5 font-mono text-[9.5px] uppercase tracking-[0.11em] text-muted-foreground md:grid md:[grid-template-columns:var(--rejilla)]"
        >
          <span role="columnheader" className="text-center">
            Pos
          </span>
          <span role="columnheader">
            <span className="sr-only">Equipo</span>
          </span>
          <span role="columnheader" className="text-center">
            Nº
          </span>
          <span role="columnheader">Piloto</span>
          {columnas.map((columna) => (
            <span key={columna} role="columnheader" className="text-right">
              {columna}
            </span>
          ))}
        </div>

        <ol role="rowgroup">{children}</ol>
      </div>
    </div>
  );
}

/**
 * Unas cuantas filas sin cabeceras: los resúmenes de la portada.
 *
 * Existe por accesibilidad y no por maquetación. `FilaDeTiempos` declara
 * `role="row"` y sus celdas `role="cell"`, y esos papeles **necesitan una tabla
 * por encima**; sueltos dentro de un `<ol>` no significan nada y un lector de
 * pantalla los ignora. En la portada no hay cabeceras que enseñar —son tres o
 * cinco filas de resumen—, así que la tabla existe pero sin fila de rótulos.
 */
export function ListaDeFilas({
  titulo,
  rejilla,
  children,
}: {
  /** El nombre de la tabla para quien no la ve. */
  titulo: string;
  rejilla: string;
  children: React.ReactNode;
}) {
  return (
    <div role="table" aria-label={titulo} style={estilo(rejilla)}>
      <ol role="rowgroup">{children}</ol>
    </div>
  );
}

export function FilaDeTiempos({
  posicion,
  dorsal,
  equipo,
  equipoId,
  equipoNacion,
  piloto,
  celdas,
  valor,
  valorEtiqueta,
  extra,
  destacada = false,
  apagada = false,
  idParaAnimar,
}: {
  /** `1`, `R`, `—`… tal como lo diga la fuente. */
  posicion: React.ReactNode;
  dorsal?: number | null;
  equipo: string;
  equipoId: string | null;
  equipoNacion?: string | null;
  piloto: {
    nombre: string;
    foto?: string | null;
    nacion?: string | null;
    /** A dónde lleva la fila. Sin él, la fila no es un enlace. */
    href?: string;
  };
  /**
   * Las celdas propias de la sesión, sin la última. Solo se ven en escritorio:
   * en el móvil bajan a `extra`.
   */
  celdas?: React.ReactNode[];
  /** El dato principal de la fila. Se ve en los dos anchos, siempre a la derecha. */
  valor: React.ReactNode;
  /** Qué es ese dato, en pequeño debajo. */
  valorEtiqueta?: string;
  /** Lo que en el móvil baja a la segunda línea. */
  extra?: React.ReactNode[];
  /** Podio, o quien marcó la vuelta rápida: fondo tenue. */
  destacada?: boolean;
  /** Quien no acabó: el nombre y la posición pierden fuerza, el resto no. */
  apagada?: boolean;
  /**
   * La marca que usa `FlipRows` para animar un reordenamiento. Es el
   * identificador de la fila, no su posición: por eso al cambiar de temporada
   * cada piloto viaja a su sitio nuevo en vez de parpadear.
   */
  idParaAnimar?: string;
}) {
  const { color } = teamColor(equipoId);

  /**
   * La tinta del dorsal, elegida midiendo y no a ojo.
   *
   * El cuadro va en el color de marca sin derivar —es lo que lo hace
   * reconocible— y sobre el turquesa de Mercedes o el gris de Cadillac el
   * blanco no se lee, igual que sobre el azul de Red Bull no se lee el negro.
   * Se comparan los dos contrastes y gana el mayor, que es la unica forma de
   * que ningun equipo futuro quede ilegible sin que nadie se acuerde de este
   * archivo.
   */
  const tintaDelDorsal =
    contrastBetween(color, '#FFFFFF') >= contrastBetween(color, '#14141A') ? '#FFFFFF' : '#14141A';

  const contenido = (
    <>
      <span
        role="cell"
        className={cn(
          'text-center font-mono text-[13px] font-semibold tabular-nums',
          destacada ? 'text-foreground' : 'text-muted-foreground',
          apagada && 'opacity-60'
        )}
      >
        {posicion}
      </span>

      {/* La barra del color del equipo. Es una celda —ocupa una columna— pero
          no dice nada que no diga ya el nombre de la escudería debajo del
          piloto, así que su contenido queda fuera del anuncio. */}
      <span role="cell" className="flex justify-center">
        <span
          aria-hidden
          className="h-8 w-[3px] rounded-sm"
          style={{ backgroundColor: color }}
        />
      </span>

      {/* El dorsal, en el color de su equipo. La tinta, medida arriba. */}
      <span
        role="cell"
        data-dorsal
        className="rounded-md py-0.5 text-center font-mono text-xs font-semibold tabular-nums"
        style={{ backgroundColor: color, color: tintaDelDorsal }}
      >
        {dorsal ?? '—'}
      </span>

      <span role="cell" className="flex min-w-0 items-center gap-2.5">
        <DriverAvatar src={piloto.foto} name={piloto.nombre} size="xs" />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <CountryFlag nationality={piloto.nacion} size={16} />
            <span
              className={cn(
                'truncate text-sm font-semibold',
                apagada && 'opacity-60'
              )}
            >
              {piloto.nombre}
            </span>
          </span>
          <span className="mt-px flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <CountryFlag nationality={equipoNacion} size={13} />
            <span className="truncate">{equipo}</span>
          </span>
        </span>
      </span>

      {celdas?.map((celda, indice) => (
        <span
          key={indice}
          role="cell"
          className="hidden text-right font-mono text-[13px] tabular-nums md:block"
        >
          {celda}
        </span>
      ))}

      <span role="cell" className="text-right">
        <span className="block font-mono text-[15px] font-semibold tabular-nums">{valor}</span>
        {valorEtiqueta && (
          <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {valorEtiqueta}
          </span>
        )}
      </span>

      {/* La segunda línea del móvil. En escritorio no existe: sus datos ya
          están arriba, cada uno en su columna. */}
      {extra && extra.length > 0 && (
        <span role="cell" className="flex gap-3 font-mono text-[10.5px] text-muted-foreground [grid-column:4/-1] md:hidden">
          {extra.map((dato, indice) => (
            <span key={indice}>{dato}</span>
          ))}
        </span>
      )}
    </>
  );

  const clases = cn(
    'relative grid min-h-[58px] items-center gap-2.5 border-b border-border/60 px-3.5 py-2 last:border-b-0',
    'grid-cols-[24px_3px_30px_minmax(0,1fr)_auto] md:[grid-template-columns:var(--rejilla)]',
    destacada && 'bg-primary/[0.07]',
    piloto.href && 'transition-colors hover:bg-accent/60'
  );

  return (
    <li
      // La marca de «esta es LA fila compartida». Existe para poder
      // comprobarlo desde fuera: la ficha de la carrera conserva su lista de
      // móvil —que se abre con un toque y enseña más— y sin esta marca una
      // prueba no distingue una fila de la otra.
      data-fila-de-tiempos
      role="row"
      className={clases}
      data-flip-id={idParaAnimar}
      // De qué equipo es la fila: `TeamAccent` la tiñe si es la del equipo
      // elegido en Favoritos. Aquí no se sabe cuál es —esto se pinta en el
      // servidor y la elección vive en el navegador—.
      data-equipo={equipoId ?? undefined}
    >
      {piloto.href ? (
        // El enlace envuelve la fila ENTERA y no solo el nombre: media fila
        // pulsable es el mismo fallo que ya se arregló en la tira de sesiones
        // de la portada. Va como capa por encima para no romper la rejilla.
        <>
          <Link
            href={piloto.href}
            transitionTypes={['nav-forward']}
            className="absolute inset-0 z-[1] rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            aria-label={piloto.nombre}
          />
          {contenido}
        </>
      ) : (
        contenido
      )}
    </li>
  );
}
