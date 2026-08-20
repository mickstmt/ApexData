import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Flag, Mountain, MoveUp, Timer, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { getCircuitHistory } from '@/lib/circuit-history';
import { añosRepetidos, contarSalida, resumirVictorias } from '@/lib/circuit-stats';
import { teamInk } from '@/lib/team-colors';
import { CircuitWinnerRows } from './CircuitWinnerRows';

// Una hora de caché, como el resto de fichas: esto cambia como mucho una vez
// por carrera.
export const revalidate = 3600;

interface CircuitPageProps {
  params: Promise<{ circuitId: string }>;
}

export async function generateMetadata({ params }: CircuitPageProps) {
  const { circuitId } = await params;

  try {
    const circuito = await getCircuitHistory(circuitId);
    if (circuito) {
      return {
        title: `${circuito.name} | ApexData`,
        description: `Ganadores, parrillas e historia del ${circuito.name}, en ${circuito.location} (${circuito.country}).`,
      };
    }
  } catch {
    // Sin base de datos el título genérico basta.
  }

  return { title: 'Circuito no encontrado | ApexData' };
}

function StatTile({
  icon: Icon,
  label,
  value,
  nota,
}: {
  icon: typeof Trophy;
  label: string;
  value: React.ReactNode;
  nota?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <div className="font-mono text-2xl font-bold tabular-nums">{value}</div>
      {nota && <p className="mt-1 text-xs text-muted-foreground">{nota}</p>}
    </div>
  );
}

/** Las listas de «quién manda aquí»: mismo formato para pilotos y equipos. */
function Ranking({
  titulo,
  filas,
  enlace,
  color,
}: {
  titulo: string;
  filas: Array<{ id: string; nombre: string; victorias: number }>;
  enlace: (id: string) => string;
  color?: boolean;
}) {
  const lider = filas[0]?.victorias ?? 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-3">
          {filas.slice(0, 5).map((fila) => (
            <li key={fila.id} className="flex items-center gap-3">
              <Link
                href={enlace(fila.id)}
                className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary"
              >
                {fila.nombre}
              </Link>

              {/* La barra dice de un vistazo cuánta ventaja saca el primero; el
                  número está al lado porque una barra sola no se lee. */}
              <span className="h-2 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span
                  className={`block h-full rounded-full ${color ? 'team-ink bg-current' : 'bg-primary'}`}
                  style={{
                    width: `${(fila.victorias / lider) * 100}%`,
                    ...(color ? teamInk(fila.id) : {}),
                  }}
                />
              </span>

              <span className="w-6 shrink-0 text-right font-mono text-sm font-semibold tabular-nums">
                {fila.victorias}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export default async function CircuitDetailPage({ params }: CircuitPageProps) {
  const { circuitId } = await params;

  let circuito;
  try {
    circuito = await getCircuitHistory(circuitId);
  } catch (error) {
    console.error('Error fetching circuit:', error);
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="mb-2 font-display text-3xl font-bold">Circuito</h1>
        <p className="text-muted-foreground">
          No se pudo cargar la ficha del circuito. Inténtalo de nuevo en un momento.
        </p>
      </div>
    );
  }

  if (!circuito) notFound();

  const resumen = resumirVictorias(circuito.victorias);
  const repetidos = añosRepetidos(circuito.victorias);
  const distintos = resumen.pilotos.length;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Link
        href="/circuits"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Todos los circuitos
      </Link>

      {/* Cabecera */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center">
        {circuito.imageUrl && (
          <div className="flex h-40 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 p-4 md:w-72">
            <Image
              src={circuito.imageUrl}
              alt={`Trazado de ${circuito.name}`}
              width={280}
              height={140}
              // Como en la lista: los trazados vienen unos con la línea en
              // blanco y otros en negro, así que se fuerzan a silueta monocroma
              // para que ninguno desaparezca contra su fondo.
              className="h-full w-auto object-contain opacity-90 brightness-0 dark:brightness-0 dark:invert"
              priority
            />
          </div>
        )}

        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <CountryFlag country={circuito.country} size={20} />
            <span className="text-sm">
              {circuito.location}, {circuito.country}
            </span>
          </div>

          <h1 className="mb-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
            {circuito.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {circuito.primera && (
              <span className="tabular-nums">
                {circuito.carreras} {circuito.carreras === 1 ? 'carrera' : 'carreras'} ·{' '}
                {circuito.primera === circuito.ultima
                  ? circuito.primera
                  : `${circuito.primera}–${circuito.ultima}`}
              </span>
            )}

            {circuito.alt !== null && (
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Mountain className="h-3.5 w-3.5" aria-hidden />
                {circuito.alt} m
              </span>
            )}

            {circuito.lat !== null && circuito.lng !== null && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${circuito.lat}&mlon=${circuito.lng}#map=14/${circuito.lat}/${circuito.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                Ver en el mapa
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}

            {circuito.url && (
              <a
                href={circuito.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                Wikipedia
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>
        </div>
      </div>

      {circuito.victorias.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
          Todavía no hay resultados cargados de este circuito.
          {circuito.carreras > 0 && ' Sus carreras sí están en el calendario.'}
        </p>
      ) : (
        <>
          {/* Lo que distingue a un circuito de otro: desde dónde se gana aquí. */}
          <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              icon={Flag}
              label="Carreras con datos"
              value={circuito.victorias.length}
              nota={`${circuito.victorias[circuito.victorias.length - 1].year}–${circuito.victorias[0].year}`}
            />
            <StatTile icon={Trophy} label="Ganadores distintos" value={distintos} />
            <StatTile
              icon={Timer}
              label="Desde la pole"
              value={`${resumen.desdeLaPole}%`}
              nota="de las victorias salieron primeros"
            />
            <StatTile
              icon={MoveUp}
              label="Parrilla media"
              value={resumen.gridMedio ?? '—'}
              nota="del ganador"
            />
          </div>

          {resumen.remontada && (
            <p className="mb-10 text-sm text-muted-foreground">
              La mayor remontada aquí la firmó{' '}
              <Link
                href={`/drivers/${resumen.remontada.driverId}`}
                className="text-foreground hover:underline"
              >
                {resumen.remontada.driver}
              </Link>{' '}
              en {resumen.remontada.year}, ganando {contarSalida(resumen.remontada.grid)}. Calculado
              sobre las temporadas cargadas en ApexData.
            </p>
          )}

          <div className="mb-10 grid gap-6 lg:grid-cols-2">
            <Ranking
              titulo="Pilotos con más victorias aquí"
              filas={resumen.pilotos}
              enlace={(id) => `/drivers/${id}`}
            />
            <Ranking
              titulo="Equipos con más victorias aquí"
              filas={resumen.equipos}
              enlace={(id) => `/constructors/${id}`}
              color
            />
          </div>

          {/* Historial de ganadores */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Historial de ganadores</CardTitle>
            </CardHeader>

            <CircuitWinnerRows victorias={circuito.victorias} />

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <caption className="sr-only">
                  Ganadores del {circuito.name} por temporada, con su parrilla de salida
                </caption>
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th scope="col" className="p-4 text-left text-sm font-semibold">
                      AÑO
                    </th>
                    <th scope="col" className="p-4 text-left text-sm font-semibold">
                      GANADOR
                    </th>
                    <th scope="col" className="p-4 text-left text-sm font-semibold">
                      EQUIPO
                    </th>
                    <th scope="col" className="p-4 text-right text-sm font-semibold">
                      SALIÓ
                    </th>
                    <th scope="col" className="p-4 text-right text-sm font-semibold">
                      TIEMPO
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {circuito.victorias.map((v) => (
                    <tr
                      key={`${v.year}-${v.round}`}
                      className="border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <th scope="row" className="p-4 text-left font-semibold">
                        <Link
                          href={`/results/${v.year}/${v.round}`}
                          className="font-mono tabular-nums hover:text-primary"
                        >
                          {v.year}
                        </Link>
                        {/* El nombre del gran premio solo en los años con dos
                            carreras aquí: sin él, las dos filas se leen como la
                            misma carrera repetida. */}
                        {repetidos.has(v.year) && (
                          <span className="block text-xs font-normal text-muted-foreground">
                            {v.raceName}
                          </span>
                        )}
                      </th>
                      <td className="p-4">
                        <Link href={`/drivers/${v.driverId}`} className="hover:text-primary">
                          {v.driver}
                        </Link>
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/constructors/${v.teamId}`}
                          className="team-ink hover:underline"
                          style={teamInk(v.teamId)}
                        >
                          {v.team}
                        </Link>
                      </td>
                      {/* Sin monoespaciada: el ordinal «1.º» se separa en
                          ella y acaba pareciendo un símbolo de grados. Las
                          cifras siguen alineadas con `tabular-nums`. */}
                      <td className="p-4 text-right tabular-nums">
                        {v.grid === 0 ? 'pit lane' : `${v.grid}.º`}
                      </td>
                      <td className="p-4 text-right font-mono text-sm tabular-nums text-muted-foreground">
                        {v.time ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
