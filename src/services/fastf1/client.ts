/**
 * FastF1 Microservice Client
 * Service to interact with the Python FastF1 microservice
 */

import type {
  DriverTelemetryResponse,
  TelemetryComparisonResponse,
  SessionLapsResponse,
  FastestLapsResponse,
  DriverLapAnalysisResponse,
  SessionWeatherResponse,
  SeasonScheduleResponse,
  SessionInfoResponse,
  SessionClassificationResponse,
  HealthCheckResponse,
  SessionType,
  TrackMapResponse,
  StintsResponse,
  PositionsMeta,
} from '@/types';
import {
  numeroAcotado,
  segmentoAnio,
  segmentoEvento,
  segmentoPiloto,
} from './segmentos';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * The telemetry service is optional infrastructure: without it the rest of the
 * app is unaffected, so its absence is reported as "not configured" rather
 * than left to fail as a connection error. In production the localhost default
 * would point at the serverless function itself, so it only applies in dev.
 */
const FASTF1_SERVICE_URL =
  process.env.FASTF1_SERVICE_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');

export const isTelemetryServiceConfigured = Boolean(FASTF1_SERVICE_URL);

export class TelemetryUnavailableError extends Error {
  constructor(message = 'El servicio de telemetría no está disponible.') {
    super(message);
    this.name = 'TelemetryUnavailableError';
  }
}

/**
 * La sesión existe en el calendario pero todavía no ha rodado.
 *
 * FastF1 no falla al pedirla: la carga entera en blanco y termina «for 0
 * drivers», y la primera línea que toca las vueltas revienta. Contarlo como un
 * error del servidor hacía que la pantalla dijera que algo se había roto por
 * nuestra parte cuando lo único que pasa es que aún no es la hora.
 */
export class SesionSinDatosError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SesionSinDatosError';
  }
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds (telemetry requests can be slow)

// ============================================================================
// CLIENT CLASS
// ============================================================================

class FastF1Client {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = FASTF1_SERVICE_URL;
    this.timeout = DEFAULT_TIMEOUT;
  }

  /** Throws when no service URL is configured, so callers can explain why. */
  private assertConfigured() {
    if (!this.baseURL) {
      throw new TelemetryUnavailableError(
        'La telemetría necesita el microservicio FastF1, que aún no está configurado.'
      );
    }
  }

  /**
   * La petición al servicio, con su tiempo límite y sus errores traducidos.
   *
   * Devuelve la respuesta sin leer el cuerpo: casi todo es JSON, pero el bloque
   * de posiciones del replay es binario, y leerlo como texto lo destrozaría.
   * Quien llama decide cómo leerlo.
   */
  private async request(endpoint: string, accept: string, timeout?: number): Promise<Response> {
    this.assertConfigured();

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeout || this.timeout
    );

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        signal: controller.signal,
        headers: {
          Accept: accept,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const mensaje =
          error.detail || `FastF1 API error: ${response.status} ${response.statusText}`;

        // Una sesión que aún no se ha corrido no es un fallo: el servicio
        // responde 404 y eso tiene que llegar tal cual hasta el navegador, en
        // vez de convertirse en «error del servidor» por el camino.
        if (response.status === 404) throw new SesionSinDatosError(mensaje);

        throw new Error(mensaje);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout || this.timeout}ms`);
        }
        throw error;
      }

      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Generic fetch method with error handling
   */
  private async fetch<T>(endpoint: string, timeout?: number): Promise<T> {
    const response = await this.request(endpoint, 'application/json', timeout);
    return await response.json();
  }

  /** Lo mismo, para lo que no es JSON. */
  private async fetchBinary(endpoint: string, timeout?: number): Promise<ArrayBuffer> {
    const response = await this.request(endpoint, 'application/octet-stream', timeout);
    return await response.arrayBuffer();
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  /**
   * Check if the FastF1 service is healthy
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    return this.fetch<HealthCheckResponse>('/health');
  }

  // ============================================================================
  // TELEMETRY
  // ============================================================================

  /**
   * Get telemetry data for a specific driver in a session
   * @param year - Season year
   * @param event - Event name or round number
   * @param sessionType - Session type (FP1, FP2, FP3, Q, S, R)
   * @param driver - Driver code (e.g., VER, HAM)
   * @param lap - Optional lap number (fastest lap if omitted)
   */
  async getDriverTelemetry(
    year: number,
    event: string | number,
    sessionType: SessionType,
    driver: string,
    lap?: number
  ): Promise<DriverTelemetryResponse> {
    let endpoint = `/api/telemetry/${segmentoAnio(year)}/${segmentoEvento(event)}/${sessionType}/${segmentoPiloto(driver)}`;
    if (lap !== undefined) {
      endpoint += `?lap=${numeroAcotado(lap, 1, 200)}`;
    }
    // Telemetry requests can be slow on first load
    return this.fetch<DriverTelemetryResponse>(endpoint, 60000);
  }

  /**
   * Compare telemetry between two drivers
   */
  async compareTelemetry(
    year: number,
    event: string | number,
    sessionType: SessionType,
    driver1: string,
    driver2: string,
    lap1?: number,
    lap2?: number
  ): Promise<TelemetryComparisonResponse> {
    const params = new URLSearchParams({
      driver1: segmentoPiloto(driver1),
      driver2: segmentoPiloto(driver2),
    });
    if (lap1 !== undefined) params.append('lap1', String(numeroAcotado(lap1, 1, 200)));
    if (lap2 !== undefined) params.append('lap2', String(numeroAcotado(lap2, 1, 200)));

    const endpoint = `/api/telemetry/${segmentoAnio(year)}/${segmentoEvento(event)}/${sessionType}/compare?${params}`;
    return this.fetch<TelemetryComparisonResponse>(endpoint, 60000);
  }

  // ============================================================================
  // LAPS
  // ============================================================================

  /**
   * Get all lap times for a session
   * @param driver - Optional driver filter
   */
  async getSessionLaps(
    year: number,
    event: string | number,
    sessionType: SessionType,
    driver?: string
  ): Promise<SessionLapsResponse> {
    let endpoint = `/api/laps/${segmentoAnio(year)}/${segmentoEvento(event)}/${sessionType}`;
    if (driver) {
      endpoint += `?driver=${segmentoPiloto(driver)}`;
    }
    return this.fetch<SessionLapsResponse>(endpoint, 60000);
  }

  /**
   * Get fastest laps from a session
   */
  /**
   * Trazado recorrido por un piloto, con la velocidad punto a punto.
   *
   * Un minuto de espera como las vueltas rápidas: la primera petición de una
   * sesión obliga al servicio a descargarla entera de la F1.
   */
  async getTrackMap(
    year: number,
    event: string | number,
    sessionType: SessionType,
    driver: string,
    lap?: number
  ): Promise<TrackMapResponse> {
    const query = lap ? `?lap=${numeroAcotado(lap, 1, 200)}` : '';
    const endpoint = `/api/telemetry/${segmentoAnio(year)}/${segmentoEvento(event)}/${sessionType}/${segmentoPiloto(driver)}/track${query}`;
    return this.fetch<TrackMapResponse>(endpoint, 60000);
  }

  /** Estrategia de neumáticos de la sesión, por piloto y en orden de llegada. */
  async getStints(
    year: number,
    event: string | number,
    sessionType: SessionType
  ): Promise<StintsResponse> {
    const endpoint = `/api/laps/${segmentoAnio(year)}/${segmentoEvento(event)}/${sessionType}/stints`;
    return this.fetch<StintsResponse>(endpoint, 60000);
  }

  // ============================================================================
  // REPLAY
  // ============================================================================

  /**
   * El JSON pequeño del replay: pilotos, línea de tiempo, cruces de vuelta,
   * estados de pista y trazado. Describe el bloque de `getPositions`.
   */
  async getPositionsMeta(
    year: number,
    event: string | number,
    sessionType: SessionType
  ): Promise<PositionsMeta> {
    const endpoint = `/api/positions/${segmentoAnio(year)}/${segmentoEvento(event)}/${sessionType}/meta`;
    return this.fetch<PositionsMeta>(endpoint, 60000);
  }

  /**
   * Las posiciones de todos los coches durante toda la carrera, en binario.
   *
   * Enteros de 16 bits little-endian: para cada piloto —en el orden del meta—
   * `count` valores de `x` y después `count` de `y`. Una carrera son ~2,6 MB
   * antes de comprimir; en JSON serían diez millones de caracteres que el
   * teléfono tendría que parsear.
   */
  async getPositions(
    year: number,
    event: string | number,
    sessionType: SessionType
  ): Promise<ArrayBuffer> {
    const endpoint = `/api/positions/${segmentoAnio(year)}/${segmentoEvento(event)}/${sessionType}`;
    return this.fetchBinary(endpoint, 60000);
  }

  async getFastestLaps(
    year: number,
    event: string | number,
    sessionType: SessionType,
    limit: number = 10
  ): Promise<FastestLapsResponse> {
    const endpoint = `/api/laps/${segmentoAnio(year)}/${segmentoEvento(event)}/${sessionType}/fastest?limit=${numeroAcotado(limit, 1, 100)}`;
    return this.fetch<FastestLapsResponse>(endpoint, 60000);
  }

  /**
   * Get detailed lap analysis for a driver
   */
  async getDriverLapAnalysis(
    year: number,
    event: string | number,
    sessionType: SessionType,
    driver: string
  ): Promise<DriverLapAnalysisResponse> {
    const endpoint = `/api/laps/${segmentoAnio(year)}/${segmentoEvento(event)}/${sessionType}/driver/${segmentoPiloto(driver)}/analysis`;
    return this.fetch<DriverLapAnalysisResponse>(endpoint, 60000);
  }

  // ============================================================================
  // WEATHER
  // ============================================================================

  /**
   * Get weather data for a session
   */
  async getSessionWeather(
    year: number,
    event: string | number,
    sessionType: SessionType
  ): Promise<SessionWeatherResponse> {
    const endpoint = `/api/weather/${segmentoAnio(year)}/${segmentoEvento(event)}/${sessionType}`;
    return this.fetch<SessionWeatherResponse>(endpoint);
  }

  // ============================================================================
  // SESSIONS & EVENTS
  // ============================================================================

  /**
   * Get the event schedule for a season
   */
  async getSeasonSchedule(year: number): Promise<SeasonScheduleResponse> {
    const endpoint = `/api/sessions/${segmentoAnio(year)}`;
    return this.fetch<SeasonScheduleResponse>(endpoint);
  }

  /**
   * Get information about a specific session
   */
  /**
   * `sondeo` es solo para el experimento de las fuentes: hace que el servicio
   * ignore lo que tenga guardado y mire de verdad. Se paga con 3,5 segundos
   * cuando la sesión aún no tiene datos, así que no lo use nada que esté
   * atendiendo a una persona.
   */
  async getSessionInfo(
    year: number,
    event: string | number,
    sessionType: SessionType,
    opciones?: { sondeo?: boolean }
  ): Promise<SessionInfoResponse> {
    const endpoint =
      `/api/sessions/${segmentoAnio(year)}/${segmentoEvento(event)}/${sessionType}/info` +
      (opciones?.sondeo ? '?sondeo=1' : '');
    return this.fetch<SessionInfoResponse>(endpoint, 60000);
  }

  /**
   * La clasificación reconstruida a partir de los tiempos de la sesión.
   *
   * Es lo que permite enseñar una parrilla el mismo día: Jolpica no publica la
   * clasificación al sprint nunca y la de carrera tarda horas, mientras que
   * FastF1 tiene los tiempos en cuanto la sesión rueda. Un minuto de espera
   * porque la primera consulta descarga la sesión entera.
   */
  async getSessionClassification(
    year: number,
    event: string | number,
    sessionType: SessionType
  ): Promise<SessionClassificationResponse> {
    const endpoint = `/api/sessions/${segmentoAnio(year)}/${segmentoEvento(event)}/${sessionType}/classification`;
    return this.fetch<SessionClassificationResponse>(endpoint, 60000);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const fastf1Client = new FastF1Client();
