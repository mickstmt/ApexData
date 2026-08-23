'use client';

import { useEffect, useState } from 'react';
import { Trophy, Calendar, MapPin, Flag, Zap, Construction, Clock } from 'lucide-react';
import Link from 'next/link';
import { teamColor } from '@/lib/team-colors';
import { intervalosAlAnterior } from '@/lib/lap-times';
import { PriorityRows } from '@/components/ui/PriorityRows';
import { SprintResults } from './SprintResults';
import { SesionPendiente } from './SesionPendiente';
import { ClasificacionSprint, VueltasDePractica } from './TiemposDeSesion';
import { comienzoDeCarrera, estadoDeSesion, queEnseñar } from '@/lib/sesiones';
import type {
  Race,
  Circuit,
  Result,
  Driver,
  Team,
  Qualifying,
  SprintResult,
} from '@prisma/client';

type RaceWithDetails = Race & {
  circuit: Circuit;
  results: (Result & {
    driver: Driver;
    team: Team;
  })[];
  qualifyings: (Qualifying & {
    driver: Driver;
    team: Team;
  })[];
  sprintResults: (SprintResult & {
    driver: Driver;
    team: Team;
  })[];
};

interface RaceDetailClientProps {
  race: RaceWithDetails;
  year: number;
  /** Pestaña con la que abrir, si la dirección lo pide. */
  sesionInicial?: string;
}

type SessionTab =
  | 'practice1'
  | 'practice2'
  | 'practice3'
  | 'sprint-qualifying'
  | 'sprint'
  | 'qualifying'
  | 'race';

interface TabConfig {
  id: SessionTab;
  label: string;
  shortLabel: string;
}

export default function RaceDetailClient({ race, year, sesionInicial }: RaceDetailClientProps) {
  // La pestaña de la dirección solo manda si es una de verdad: un `?sesion=`
  // inventado abre la carrera, que es el destino razonable.
  const PESTAÑAS_VALIDAS: SessionTab[] = [
    'race',
    'qualifying',
    'sprint',
    'sprint-qualifying',
    'practice1',
    'practice2',
    'practice3',
  ];

  const [activeTab, setActiveTab] = useState<SessionTab>(
    PESTAÑAS_VALIDAS.includes(sesionInicial as SessionTab) ? (sesionInicial as SessionTab) : 'race'
  );

  /**
   * La hora, decidida en el navegador.
   *
   * Distinguir «aún no se corre» de «ya terminó y no han publicado» depende de
   * qué hora es, y esta página se sirve cacheada: decidirlo en el servidor
   * dejaría el mensaje congelado. Hasta que monta, `null` — y entonces se pinta
   * el aviso sencillo de siempre, sin prometer nada.
   */
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    // El reloj es justo eso: un sistema externo del que la página se entera al
    // montar. No se puede leer durante el render sin arriesgar que servidor y
    // navegador no coincidan.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAhora(Date.now());
  }, []);

  const comienzoDeLaCarrera = comienzoDeCarrera(new Date(race.date), race.time);

  // Se calculan aquí y no dentro del JSX: `Date.now()` en pleno render es una
  // llamada impura —el compilador de React lo rechaza— y además el resultado
  // debe ser el mismo en toda la pintura.
  const estadoCarrera =
    ahora === null
      ? null
      : queEnseñar({
          nombre: 'Carrera',
          cuando: comienzoDeLaCarrera,
          tieneResultados: false,
          ahora,
        });

  const estadoSprint =
    ahora === null
      ? null
      : queEnseñar({
          nombre: 'Sprint',
          cuando: race.sprintDate,
          tieneResultados: false,
          ahora,
        });

  /**
   * Si el fin de semana tuvo sprint, sale del propio dato.
   *
   * Estaba fijado a `false` a mano —con un comentario que decía «puedes agregar
   * lógica basada en la ronda»—, así que las pestañas del sprint no aparecían
   * nunca. La base guarda sus resultados desde el primer sembrado.
   */
  // De si está PROGRAMADO, no de si ya hay resultados: derivarlo de los
  // resultados hacía desaparecer la pestaña justo el fin de semana en que
  // interesa —antes de que el sprint se corra—, que es cuando alguien entra a
  // ver a qué hora es y desde dónde sale su piloto.
  const isSprintWeekend = race.sprintDate !== null || race.sprintResults.length > 0;

  /**
   * Si la sesión que decide una parrilla ya rodó.
   *
   * Solo entonces tiene sentido ir a buscar sus tiempos: pedirlos antes es
   * pedirle a la cronometría una sesión que aún no existe.
   */
  const yaRodo = (cuando: Date | string | null, nombre: string) =>
    ahora !== null &&
    cuando !== null &&
    estadoDeSesion(nombre, new Date(cuando), ahora) === 'pasada';

  const parrillaDeLaCarrera = yaRodo(race.qualiDate, 'Clasificación')
    ? ({ year, round: race.round, sesion: 'Q' } as const)
    : undefined;

  // La del sprint no puede salir de la base: la ordena la clasificación al
  // sprint y esa sesión Jolpica no la publica. Rehacerla desde los tiempos es
  // la única forma de enseñarla el sábado por la mañana.
  const parrillaDelSprint = yaRodo(race.sprintQualiDate, 'Clasif. sprint')
    ? ({ year, round: race.round, sesion: 'SQ' } as const)
    : undefined;

  /**
   * Las pestañas cuyos tiempos no salen de la base, sino de la cronometría.
   *
   * Prácticas y clasificación al sprint: Jolpica no las publica —Ergast nunca
   * las tuvo—, pero FastF1 sí, y los endpoints llevan tiempo respondiendo. Aquí
   * solo se dice qué sesión pedir y cuándo se corrió; el resto lo deciden
   * `queEnseñar` y los componentes de `TiemposDeSesion`.
   *
   * `nombre` es como la llama `sesiones.ts` —de ahí sale su duración—, y
   * `titulo` como se la nombra dentro de una frase.
   */
  const CRONOMETRADAS: Partial<
    Record<
      SessionTab,
      {
        sesion: 'SQ' | 'FP1' | 'FP2' | 'FP3';
        cuando: Date | null;
        nombre: string;
        titulo: string;
      }
    >
  > = {
    'sprint-qualifying': {
      sesion: 'SQ',
      cuando: race.sprintQualiDate,
      nombre: 'Clasif. sprint',
      titulo: 'La clasificación al sprint',
    },
    practice1: {
      sesion: 'FP1',
      cuando: race.fp1Date,
      nombre: 'Práctica 1',
      titulo: 'La práctica libre 1',
    },
    practice2: {
      sesion: 'FP2',
      cuando: race.fp2Date,
      nombre: 'Práctica 2',
      titulo: 'La práctica libre 2',
    },
    practice3: {
      sesion: 'FP3',
      cuando: race.fp3Date,
      nombre: 'Práctica 3',
      titulo: 'La práctica libre 3',
    },
  };

  const cronometrada = CRONOMETRADAS[activeTab];

  const estadoCronometrada =
    ahora === null || !cronometrada || cronometrada.cuando === null
      ? null
      : queEnseñar({
          nombre: cronometrada.nombre,
          cuando: cronometrada.cuando,
          tieneResultados: false,
          ahora,
        });

  /**
   * Sin fecha de sesión, la carrera decide.
   *
   * Las temporadas viejas no guardan las horas de las prácticas. Si la carrera
   * ya se corrió, esa sesión quedó atrás con total seguridad y sus tiempos se
   * pueden pedir; si ni eso se sabe, se conserva el cartel de siempre.
   */
  const elFinDeSemanaYaPaso = yaRodo(comienzoDeLaCarrera, 'Carrera');

  /**
   * Las pestañas van de lo más importante a lo menos, no en orden cronológico.
   *
   * Esta es una página de resultados de una carrera **terminada**: lo que se
   * viene a ver es quién ganó. Con el orden del fin de semana, la carrera
   * quedaba la última y en un teléfono había que arrastrar la fila de pestañas
   * para encontrarla — enterrar lo principal detrás de tres prácticas.
   */
  const tabs: TabConfig[] = [
    { id: 'race', label: 'Carrera', shortLabel: 'CARRERA' },
    { id: 'qualifying', label: 'Clasificación', shortLabel: 'CLASI' },
    ...(isSprintWeekend
      ? ([
          { id: 'sprint', label: 'Sprint', shortLabel: 'SPRINT' },
          { id: 'sprint-qualifying', label: 'Clasificación Sprint', shortLabel: 'CLASI. SPRINT' },
          { id: 'practice1', label: 'Práctica Libre 1', shortLabel: 'PL1' },
        ] as TabConfig[])
      : ([
          { id: 'practice3', label: 'Práctica Libre 3', shortLabel: 'PL3' },
          { id: 'practice2', label: 'Práctica Libre 2', shortLabel: 'PL2' },
          { id: 'practice1', label: 'Práctica Libre 1', shortLabel: 'PL1' },
        ] as TabConfig[])),
  ];

  // Find fastest lap
  /**
   * A cuánto quedó cada piloto del que tiene delante.
   *
   * El tiempo que se enseña de cada uno es su mejor vuelta, y esa vuelta viene
   * de un tramo distinto según hasta dónde llegó: Q3 los diez primeros, Q2 los
   * cinco siguientes, Q1 el resto. La diferencia solo se da dentro del mismo
   * tramo — restar a través de esa frontera no significa nada, y sale negativa
   * cuando alguien rueda en Q3 más lento que su propia vuelta de Q2.
   */
  const intervaloDeQualy = new Map<string, string | null>();
  if (race.qualifyings) {
    const calculados = intervalosAlAnterior(
      race.qualifyings.map((entry) => ({
        time: entry.q3 || entry.q2 || entry.q1,
        segment: entry.q3 ? 3 : entry.q2 ? 2 : 1,
      }))
    );
    race.qualifyings.forEach((entry, indice) => intervaloDeQualy.set(entry.id, calculados[indice]));
  }

  const fastestLapResult = race.results
    .filter((r) => r.fastestLapTime)
    .sort((a, b) => {
      if (!a.fastestLapTime || !b.fastestLapTime) return 0;
      return a.fastestLapTime.localeCompare(b.fastestLapTime);
    })[0];

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/results?season=${year}`}
          className="text-sm text-muted-foreground hover:text-primary transition-colors mb-4 inline-block"
        >
          ← Volver a Resultados
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="font-semibold">ROUND {race.round}</span>
              <span>•</span>
              <span>{year}</span>
            </div>
            <h1 className="text-4xl font-bold mb-2 md:text-5xl">{race.raceName}</h1>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{race.circuit.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(race.date).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Tabs
          Eran seis botones sueltos: un lector de pantalla los anunciaba sin
          decir que forman un grupo, cuál está activa ni qué cambian al
          pulsarlas. Con los roles de pestañas eso queda dicho, y con las
          flechas se pueden recorrer como se espera de unas pestañas: solo la
          activa recibe tabulación, y las flechas mueven entre ellas. */}
      <div className="mb-8 overflow-x-auto">
        <div
          role="tablist"
          aria-label="Sesiones del fin de semana"
          className="flex gap-2 border-b border-border min-w-max"
          onKeyDown={(event) => {
            const paso = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
            if (!paso) return;

            event.preventDefault();
            const actual = tabs.findIndex((tab) => tab.id === activeTab);
            const siguiente = tabs[(actual + paso + tabs.length) % tabs.length];
            setActiveTab(siguiente.id);
            document.getElementById(`tab-${siguiente.id}`)?.focus();
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={activeTab === tab.id}
              // Solo se renderiza el panel activo, así que las demás pestañas
              // apuntaban a un id inexistente.
              aria-controls={activeTab === tab.id ? `panel-${tab.id}` : undefined}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[44px] px-6 py-3 text-sm font-semibold transition-colors border-b-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">{tab.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content based on active tab */}
      <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
      {activeTab === 'race' && race.results.length === 0 && ahora === null ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Flag className="mx-auto mb-4 h-16 w-16 text-muted-foreground" aria-hidden />
          <h3 className="mb-2 text-2xl font-bold">Sin resultados todavía</h3>
        </div>
      ) : activeTab === 'race' && race.results.length === 0 && estadoCarrera ? (
        // Sin esta guarda, una carrera aún no disputada pintaba las cabeceras
        // de la tabla sin una sola fila, un «VUELTAS: 0» y un «Podio» vacío:
        // el mismo aspecto que tiene un fallo, sin serlo. Y ahora, además, dice
        // qué falta exactamente y enseña la parrilla si ya se conoce.
        <SesionPendiente
          nombre="La carrera"
          estado={estadoCarrera}
          parrilla={race.qualifyings}
          reconstruir={parrillaDeLaCarrera}
        />
      ) : activeTab === 'race' ? (
        <>
          {/* Race Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Winner */}
            {race.results[0] && (
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Trophy className="h-4 w-4" />
                  <span className="font-semibold">GANADOR</span>
                </div>
                <div className="text-2xl font-bold">
                  {race.results[0].driver.givenName} {race.results[0].driver.familyName}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {race.results[0].team.name}
                </div>
              </div>
            )}

            {/* Laps */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Flag className="h-4 w-4" />
                <span className="font-semibold">VUELTAS</span>
              </div>
              <div className="text-2xl font-bold">{race.results[0]?.laps || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Vueltas completadas</div>
            </div>

            {/* Fastest Lap */}
            {fastestLapResult && (
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Zap className="h-4 w-4" />
                  <span className="font-semibold">VUELTA RÁPIDA</span>
                </div>
                <div className="text-2xl font-bold font-mono">
                  {fastestLapResult.fastestLapTime}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {fastestLapResult.driver.familyName}
                  {fastestLapResult.fastestLapSpeed &&
                    ` - ${fastestLapResult.fastestLapSpeed} km/h`}
                </div>
              </div>
            )}
          </div>

          {/* Results Table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {/* En móvil, la fila enseña posición, piloto y tiempo, y guarda el
                resto tras un toque: la tabla entera mide ~900 px y obligaba a
                arrastrarla perdiendo de vista la posición. */}
            <PriorityRows
              rows={race.results}
              getKey={(result) => result.id}
              label={(result) => `${result.driver.givenName} ${result.driver.familyName}`}
              lead={(result) => (
                <>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold ${
                      result.position === 1
                        ? 'bg-podium-gold/20 text-podium-gold'
                        : result.position && result.position <= 3
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted/50 text-foreground'
                    }`}
                  >
                    {result.positionText}
                  </span>
                  <span
                    aria-hidden
                    className="h-8 w-1 shrink-0 rounded-sm"
                    style={{ backgroundColor: teamColor(result.team.constructorId).color }}
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {result.driver.familyName}
                  </span>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                    {result.time || result.status}
                  </span>
                </>
              )}
              detail={(result) => [
                {
                  label: 'Piloto',
                  value: (
                    <Link href={`/drivers/${result.driver.driverId}`} className="hover:text-primary">
                      {result.driver.givenName} {result.driver.familyName}
                    </Link>
                  ),
                },
                {
                  label: 'Equipo',
                  value: (
                    <Link
                      href={`/constructors/${result.team.constructorId}`}
                      className="hover:text-primary"
                    >
                      {result.team.name}
                    </Link>
                  ),
                },
                { label: 'Dorsal', value: result.driver.permanentNumber ?? '—' },
                { label: 'Vueltas', value: result.laps },
                { label: 'Puntos', value: result.points },
                { label: 'Parrilla', value: result.grid || '—' },
              ]}
            />

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                  <caption className="sr-only">Resultado de la carrera por piloto</caption>
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th scope="col" className="p-4 text-left text-sm font-semibold text-foreground w-16">POS</th>
                    <th scope="col" className="p-4 text-left text-sm font-semibold text-foreground w-20">NO</th>
                    <th scope="col" className="p-4 text-left text-sm font-semibold text-foreground">PILOTO</th>
                    <th scope="col" className="p-4 text-left text-sm font-semibold text-foreground">EQUIPO</th>
                    <th scope="col" className="p-4 text-right text-sm font-semibold text-foreground w-20">VUELTAS</th>
                    <th scope="col" className="p-4 text-right text-sm font-semibold text-foreground w-32">
                      TIEMPO/ABANDONO
                    </th>
                    <th scope="col" className="p-4 text-right text-sm font-semibold text-foreground w-20">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {race.results.map((result) => {
                    const isPodium = result.position && result.position <= 3;
                    const isWinner = result.position === 1;

                    return (
                      <tr
                        key={result.id}
                        className={`border-b border-border transition-colors hover:bg-muted/30 ${
                          isPodium ? 'bg-muted/20' : ''
                        }`}
                      >
                        {/* Position */}
                        <td className="p-4">
                          <div
                            className={`flex items-center justify-center h-10 w-10 rounded-md font-bold ${
                              isWinner
                                ? 'bg-podium-gold/20 text-podium-gold'
                                : isPodium
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted/50 text-foreground'
                            }`}
                          >
                            {result.positionText}
                          </div>
                        </td>

                        {/* Number */}
                        <td className="p-4">
                          <div className="text-lg font-bold text-muted-foreground">
                            {result.driver.permanentNumber || '—'}
                          </div>
                        </td>

                        {/* Driver */}
                        <td className="p-4">
                          <Link
                            href={`/drivers/${result.driver.driverId}`}
                            className="hover:text-primary transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                                {result.driver.code ||
                                  result.driver.familyName.slice(0, 3).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold">
                                  {result.driver.givenName} {result.driver.familyName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {result.driver.nationality}
                                </div>
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* Team */}
                        <td className="p-4">
                          <Link
                            href={`/constructors/${result.team.constructorId}`}
                            className="text-sm hover:text-primary transition-colors"
                          >
                            {result.team.name}
                          </Link>
                        </td>

                        {/* Laps */}
                        <td className="p-4 text-right text-sm text-muted-foreground">
                          {result.laps}
                        </td>

                        {/* Time/Status */}
                        <td className="p-4 text-right">
                          {result.time ? (
                            <span className="font-mono text-sm font-semibold">{result.time}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">{result.status}</span>
                          )}
                        </td>

                        {/* Points */}
                        <td className="p-4 text-right">
                          <span
                            className={`font-bold ${
                              result.points > 0 ? 'text-primary' : 'text-muted-foreground'
                            }`}
                          >
                            {result.points}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Podium */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Podio
              </h2>
              <div className="space-y-3">
                {race.results.slice(0, 3).map((result, index) => (
                  <div key={result.id} className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                        index === 0
                          ? 'bg-podium-gold/20 text-podium-gold'
                          : index === 1
                          ? 'bg-podium-silver/20 text-podium-silver'
                          : 'bg-podium-bronze/20 text-podium-bronze'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">
                        {result.driver.givenName} {result.driver.familyName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.team.name}
                      </div>
                    </div>
                    <div className="font-bold text-primary">{result.points} pts</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Circuit Info */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Información del Circuito
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Circuito:</span>
                  <span className="font-semibold">{race.circuit.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ubicación:</span>
                  <span className="font-semibold">{race.circuit.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">País:</span>
                  <span className="font-semibold">{race.circuit.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha:</span>
                  <span className="font-semibold">
                    {new Date(race.date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'qualifying' ? (
        <>
          {/* Qualifying Results */}
          {race.qualifyings && race.qualifyings.length > 0 ? (
            <>
              {/* Pole Position */}
              {race.qualifyings[0] && (
                <div className="mb-8">
                  <div className="rounded-lg border border-primary bg-primary/5 p-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="font-semibold">POLE POSITION</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">
                          {race.qualifyings[0].driver.givenName} {race.qualifyings[0].driver.familyName}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {race.qualifyings[0].team.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold font-mono text-primary">
                          {race.qualifyings[0].q3 || race.qualifyings[0].q2 || race.qualifyings[0].q1}
                        </div>
                        <div className="text-sm text-muted-foreground">Mejor tiempo</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Qualifying Table */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <PriorityRows
                  rows={race.qualifyings}
                  getKey={(entry) => entry.id}
                  label={(entry) => `${entry.driver.givenName} ${entry.driver.familyName}`}
                  lead={(entry) => (
                    <>
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold ${
                          entry.position === 1
                            ? 'bg-podium-gold/20 text-podium-gold'
                            : entry.position <= 3
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted/50 text-foreground'
                        }`}
                      >
                        {entry.position}
                      </span>
                      <span
                        aria-hidden
                        className="h-8 w-1 shrink-0 rounded-sm"
                        style={{ backgroundColor: teamColor(entry.team.constructorId).color }}
                      />
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {entry.driver.familyName}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-sm tabular-nums text-muted-foreground">
                          {entry.q3 || entry.q2 || entry.q1 || '—'}
                        </span>
                        {intervaloDeQualy.get(entry.id) && (
                          <span className="block font-mono text-[10px] tabular-nums text-muted-foreground">
                            <span className="sr-only">Diferencia con el de delante: </span>
                            {intervaloDeQualy.get(entry.id)}
                          </span>
                        )}
                      </span>
                    </>
                  )}
                  detail={(entry) => [
                    {
                      label: 'Piloto',
                      value: (
                        <Link href={`/drivers/${entry.driver.driverId}`} className="hover:text-primary">
                          {entry.driver.givenName} {entry.driver.familyName}
                        </Link>
                      ),
                    },
                    {
                      label: 'Equipo',
                      value: (
                        <Link
                          href={`/constructors/${entry.team.constructorId}`}
                          className="hover:text-primary"
                        >
                          {entry.team.name}
                        </Link>
                      ),
                    },
                    { label: 'Q1', value: <span className="font-mono">{entry.q1 || '—'}</span> },
                    { label: 'Q2', value: <span className="font-mono">{entry.q2 || '—'}</span> },
                    { label: 'Q3', value: <span className="font-mono">{entry.q3 || '—'}</span> },
                  ]}
                />

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                      <caption className="sr-only">Clasificación por piloto, con los tiempos de Q1, Q2 y Q3</caption>
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th scope="col" className="p-4 text-left text-sm font-semibold text-foreground w-16">POS</th>
                        <th scope="col" className="p-4 text-left text-sm font-semibold text-foreground w-20">NO</th>
                        <th scope="col" className="p-4 text-left text-sm font-semibold text-foreground">PILOTO</th>
                        <th scope="col" className="p-4 text-left text-sm font-semibold text-foreground">EQUIPO</th>
                        <th scope="col" className="p-4 text-right text-sm font-semibold text-foreground w-32">Q1</th>
                        <th scope="col" className="p-4 text-right text-sm font-semibold text-foreground w-32">Q2</th>
                        <th scope="col" className="p-4 text-right text-sm font-semibold text-foreground w-32">Q3</th>
                        <th
                          scope="col"
                          className="p-4 text-right text-sm font-semibold text-foreground w-28"
                        >
                          {/* El `title` no lo ve quien va con el dedo ni quien
                              va con lector de pantalla; la aclaración va en el
                              propio encabezado, oculta a la vista. */}
                          INT.
                          <span className="sr-only"> (diferencia con el piloto de delante)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {race.qualifyings.map((result) => {
                        const isTop3 = result.position <= 3;
                        const isPole = result.position === 1;

                        return (
                          <tr
                            key={result.id}
                            className={`border-b border-border transition-colors hover:bg-muted/30 ${
                              isTop3 ? 'bg-muted/20' : ''
                            }`}
                          >
                            {/* Position */}
                            <td className="p-4">
                              <div
                                className={`flex items-center justify-center h-10 w-10 rounded-md font-bold ${
                                  isPole
                                    ? 'bg-podium-gold/20 text-podium-gold'
                                    : isTop3
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-muted/50 text-foreground'
                                }`}
                              >
                                {result.position}
                              </div>
                            </td>

                            {/* Number */}
                            <td className="p-4">
                              <div className="text-lg font-bold text-muted-foreground">
                                {result.driver.permanentNumber || '—'}
                              </div>
                            </td>

                            {/* Driver */}
                            <td className="p-4">
                              <Link
                                href={`/drivers/${result.driver.driverId}`}
                                className="hover:text-primary transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                                    {result.driver.code ||
                                      result.driver.familyName.slice(0, 3).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold">
                                      {result.driver.givenName} {result.driver.familyName}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {result.driver.nationality}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            </td>

                            {/* Team */}
                            <td className="p-4">
                              <Link
                                href={`/constructors/${result.team.constructorId}`}
                                className="text-sm hover:text-primary transition-colors"
                              >
                                {result.team.name}
                              </Link>
                            </td>

                            {/* Q1 */}
                            <td className="p-4 text-right">
                              <span className="font-mono text-sm font-semibold">
                                {result.q1 || '—'}
                              </span>
                            </td>

                            {/* Q2 */}
                            <td className="p-4 text-right">
                              {result.q2 ? (
                                <span className="font-mono text-sm font-semibold">{result.q2}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Q3 */}
                            <td className="p-4 text-right">
                              {result.q3 ? (
                                <span className="font-mono text-sm font-semibold text-primary">
                                  {result.q3}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Diferencia con el de delante */}
                            <td className="p-4 text-right">
                              <span className="font-mono text-sm tabular-nums text-muted-foreground">
                                {intervaloDeQualy.get(result.id) ?? '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top 3 */}
                <div className="rounded-lg border border-border bg-card p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Top 3 de la clasificación
                  </h2>
                  <div className="space-y-3">
                    {race.qualifyings.slice(0, 3).map((result, index) => (
                      <div key={result.id} className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                            index === 0
                              ? 'bg-podium-gold/20 text-podium-gold'
                              : index === 1
                              ? 'bg-podium-silver/20 text-podium-silver'
                              : 'bg-podium-bronze/20 text-podium-bronze'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">
                            {result.driver.givenName} {result.driver.familyName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {result.team.name}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-primary">
                          {result.q3 || result.q2 || result.q1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session Info */}
                <div className="rounded-lg border border-border bg-card p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Información de Clasificación
                  </h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Q3 (Top 10):</span>
                      <span className="font-semibold">
                        {race.qualifyings.filter((q) => q.q3).length} pilotos
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Q2 (Top 15):</span>
                      <span className="font-semibold">
                        {race.qualifyings.filter((q) => q.q2).length} pilotos
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Q1 (Todos):</span>
                      <span className="font-semibold">
                        {race.qualifyings.filter((q) => q.q1).length} pilotos
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 mt-2">
                      <span className="text-muted-foreground">Total participantes:</span>
                      <span className="font-semibold">{race.qualifyings.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <Clock className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-2xl font-bold">Sin Datos de Clasificación</h3>
              <p className="text-lg text-muted-foreground">
                No hay datos de clasificación disponibles para esta carrera.
              </p>
            </div>
          )}
        </>
      ) : activeTab === 'sprint' ? (
        race.sprintResults.length > 0 ? (
          <SprintResults resultados={race.sprintResults} />
        ) : (
          estadoSprint && (
            <SesionPendiente
              nombre="El sprint"
              estado={estadoSprint}
              reconstruir={parrillaDelSprint}
            />
          )
        )
      ) : ahora === null || !cronometrada ? (
        // Antes de hidratar no se sabe qué hora es, y de eso depende todo lo de
        // abajo: se pinta nada, como en el resto de las pestañas.
        null
      ) : estadoCronometrada?.tipo === 'aun-no-corre' ||
        estadoCronometrada?.tipo === 'en-curso' ? (
        // Aún no se corre o está rodando: la cuenta atrás, igual que las demás.
        // Pedir la sesión ahora sería pedirle a la cronometría algo que todavía
        // no existe.
        <SesionPendiente nombre={cronometrada.titulo} estado={estadoCronometrada} />
      ) : estadoCronometrada?.tipo === 'sin-publicar' || elFinDeSemanaYaPaso ? (
        /*
         * Ya se corrió: los tiempos están y se piden.
         *
         * Esta pestaña enseñaba un cartel diciendo que Jolpica no publica las
         * prácticas ni la clasificación al sprint. Era verdad y sigue siéndolo,
         * pero desde hace tiempo esos tiempos llegan por FastF1 y los dos
         * endpoints responden en producción: el cartel había pasado de explicar
         * una ausencia a esconder un dato que ya teníamos.
         *
         * El segundo caso —sin fecha de sesión pero con la carrera ya corrida—
         * es el de las temporadas viejas, que no guardan las horas de las
         * prácticas: si el domingo quedó atrás, el viernes también.
         */
        cronometrada.sesion === 'SQ' ? (
          <ClasificacionSprint year={year} round={race.round} />
        ) : (
          <VueltasDePractica
            year={year}
            round={race.round}
            sesion={cronometrada.sesion}
            nombre={cronometrada.titulo}
          />
        )
      ) : (
        /*
         * No hay forma de saber si esa sesión llegó a correrse: sin su hora y
         * sin una carrera pasada, preguntar por sus tiempos sería adivinar. Se
         * conserva el cartel de siempre, que al menos dice a dónde ir.
         */
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <Construction className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
          <h3 className="mb-2 text-xl font-bold">
            Todavía no hay datos de {tabs.find((t) => t.id === activeTab)?.label}
          </h3>
          <p className="mx-auto mb-4 max-w-prose text-sm text-muted-foreground">
            La fuente de resultados que usa esta página —Jolpica— publica carrera, clasificación y
            sprint, pero no las prácticas libres ni la clasificación al sprint.
          </p>
          <p className="mx-auto max-w-prose text-sm text-muted-foreground">
            Esos tiempos sí están en FastF1, que ya alimenta la sección de{' '}
            <Link href="/analysis" className="text-primary hover:underline">
              análisis
            </Link>
            : ahí puedes ver ahora mismo las vueltas de cualquier sesión de este fin de semana.
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
