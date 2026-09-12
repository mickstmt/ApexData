/**
 * Cliente de OpenF1.
 *
 * ## Por qué existe habiendo ya dos fuentes
 *
 * Cada una hace lo que la otra no puede:
 *
 * - **Jolpica** llena la base de datos. Es la única con historia desde 1950 y
 *   la única que publica el resultado ya sancionado por comisarios.
 * - **FastF1** da la telemetría: vueltas, sectores, neumáticos, trazado.
 * - **OpenF1**, esto, dispara los avisos. Y solo eso.
 *
 * El reparto no es un capricho de arquitectura, viene de una medición. El aviso
 * del GP de Italia 2026 salió a las 18:45 hora de Lima para una carrera que
 * terminó antes de las 11:00. Las ejecuciones del cron de aquella tarde —16:46,
 * 18:51 y 21:03 UTC— corrieron enteras y no avisaron de nada: Jolpica seguía
 * sin publicar. Tardó entre seis y ocho horas.
 *
 * OpenF1 publica al salir de su ventana «en directo», que son treinta minutos
 * después de la bandera. Y tiene las siete sesiones del fin de semana, prácticas
 * incluidas, que Jolpica no tuvo nunca.
 *
 * ## Lo que esto NO hace
 *
 * No escribe en la base. Lo que devuelve sirve para redactar un aviso y nada
 * más; el resultado bueno lo sigue sembrando Jolpica cuando llega. Si algún día
 * OpenF1 y la base discrepan, manda la base.
 */

import { API_ENDPOINTS, API_CONFIG } from '@/config';

import type {
  FilaDeSesion,
  PilotoOpenF1,
  ResultadoOpenF1,
  SesionOpenF1,
} from './tipos';

/** No se pudo hablar con OpenF1, o contestó algo que no es una lista. */
export class OpenF1NoDisponibleError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'OpenF1NoDisponibleError';
  }
}

/**
 * Cuánto se espera entre reintentos.
 *
 * OpenF1 corta por ritmo con un 429 en cuanto se le piden varias sesiones
 * seguidas —comprobado al traer un fin de semana entero— y el corte es
 * temporal: con esperar un poco vuelve a contestar. Sin esto, traer las cinco
 * sesiones de un Gran Premio fallaba a la tercera.
 */
const ESPERAS = [1000, 3000, 7000];

async function duerme(ms: number): Promise<void> {
  return new Promise((listo) => setTimeout(listo, ms));
}

/**
 * Los estados que mejoran esperando, y por qué el 401 está entre ellos.
 *
 * Los evidentes son el corte por ritmo (429) y los fallos del servidor (5xx).
 * Un 400 no mejora por insistir, y por eso no está.
 *
 * El **401 y el 403 sí están**, y es contraintuitivo: normalmente significan
 * «no tienes permiso», que no se arregla reintentando. Pero OpenF1 no pide
 * credenciales —sus datos históricos son libres— así que un 401 suyo no puede
 * ser eso. Lo que es, medido el 2026-09-12: su limitador cortando las IPs
 * compartidas de los runners de GitHub. Dos vueltas del reloj murieron con
 * `OpenF1 respondió 401` mientras desde una conexión doméstica la misma URL
 * devolvía 200 tres de tres, a la misma hora.
 *
 * Si algún día OpenF1 cerrara de verdad su API, esto lo convertiría en cuatro
 * intentos en vez de uno antes de rendirse — once segundos de más, una vez por
 * vuelta. Barato comparado con perder la vuelta entera por un tropiezo.
 */
const REINTENTABLES = new Set([401, 403, 429]);

/**
 * Una petición a OpenF1 que devuelve una lista, con reintentos.
 */
async function pedirLista<T>(url: string): Promise<T[]> {
  let ultimo = '';

  for (let intento = 0; intento <= ESPERAS.length; intento++) {
    if (intento > 0) await duerme(ESPERAS[intento - 1]);

    const control = new AbortController();
    const corte = setTimeout(() => control.abort(), API_CONFIG.timeout);

    try {
      const respuesta = await fetch(url, {
        signal: control.signal,
        headers: { Accept: 'application/json' },
        // Los avisos no pueden leer una copia guardada: si la sesión acaba de
        // terminar, lo que interesa es justo lo que aún no estaba.
        cache: 'no-store',
      });

      if (REINTENTABLES.has(respuesta.status) || respuesta.status >= 500) {
        ultimo = `HTTP ${respuesta.status}`;
        continue;
      }

      if (!respuesta.ok) {
        throw new OpenF1NoDisponibleError(`OpenF1 respondió ${respuesta.status} a ${url}`);
      }

      const datos: unknown = await respuesta.json();

      // Cuando OpenF1 rechaza algo devuelve un objeto con el motivo, no una
      // lista. Sin esta comprobación el `.map()` de más abajo reventaba con un
      // «map is not a function» que no dice nada de lo que pasó.
      if (!Array.isArray(datos)) {
        throw new OpenF1NoDisponibleError(`OpenF1 no devolvió una lista en ${url}`);
      }

      return datos as T[];
    } catch (error) {
      if (error instanceof OpenF1NoDisponibleError) throw error;
      ultimo = error instanceof Error ? error.message : String(error);
    } finally {
      clearTimeout(corte);
    }
  }

  throw new OpenF1NoDisponibleError(`OpenF1 no contestó tras ${ESPERAS.length + 1} intentos: ${ultimo}`);
}

/** Las sesiones de una temporada, en el orden en que se corren. */
export async function sesionesDeTemporada(anio: number): Promise<SesionOpenF1[]> {
  const sesiones = await pedirLista<SesionOpenF1>(API_ENDPOINTS.openf1.sessions(anio));

  return sesiones
    .filter((s) => !s.is_cancelled)
    .sort((a, b) => a.date_start.localeCompare(b.date_start));
}

/**
 * El último valor no nulo, que es el que cuenta.
 *
 * En clasificación OpenF1 manda un tiempo por segmento. El bueno es el del
 * último al que llegó el piloto: quien cae en Q1 se compara con su vuelta de
 * Q1, y quien llega a Q3 con la de Q3.
 */
export function ultimoValor(valor: number | number[] | null): number | null {
  if (valor == null) return null;
  if (!Array.isArray(valor)) return valor;

  for (let i = valor.length - 1; i >= 0; i--) {
    if (valor[i] != null) return valor[i];
  }

  return null;
}

/**
 * La clasificación de una sesión, con los pilotos ya pegados.
 *
 * Los que no acabaron van al final y **no se descartan**: un abandono es la
 * noticia más importante que puede darle un aviso a quien sigue a ese piloto.
 * Filtrarlos por no tener puesto fue justo el fallo que hizo que el aviso de
 * Monza dijera «Ganó Antonelli» a un aficionado de Ferrari cuyo piloto se había
 * retirado.
 */
export async function clasificacionDeSesion(sessionKey: number): Promise<FilaDeSesion[]> {
  const [resultados, pilotos] = await Promise.all([
    pedirLista<ResultadoOpenF1>(API_ENDPOINTS.openf1.sessionResult(sessionKey)),
    pedirLista<PilotoOpenF1>(API_ENDPOINTS.openf1.drivers(sessionKey)),
  ]);

  const porDorsal = new Map(pilotos.map((p) => [p.driver_number, p]));

  return resultados
    .map((r): FilaDeSesion => {
      const piloto = porDorsal.get(r.driver_number);

      return {
        puesto: r.position ?? null,
        dorsal: r.driver_number,
        nombre: piloto?.full_name ?? `#${r.driver_number}`,
        codigo: piloto?.name_acronym ?? String(r.driver_number),
        equipo: piloto?.team_name ?? '',
        color: piloto?.team_colour ?? null,
        tiempo: ultimoValor(r.duration),
        puntos: r.points ?? null,
        abandono: Boolean(r.dnf),
        noSalio: Boolean(r.dns),
        descalificado: Boolean(r.dsq),
      };
    })
    .sort((a, b) => (a.puesto ?? Number.MAX_SAFE_INTEGER) - (b.puesto ?? Number.MAX_SAFE_INTEGER));
}
