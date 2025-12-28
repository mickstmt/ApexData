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
  HealthCheckResponse,
  SessionType,
} from '@/types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const FASTF1_SERVICE_URL = process.env.FASTF1_SERVICE_URL || 'http://localhost:8000';
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

  /**
   * Generic fetch method with error handling
   */
  private async fetch<T>(endpoint: string, timeout?: number): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeout || this.timeout
    );

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.detail || `FastF1 API error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
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
    let endpoint = `/api/telemetry/${year}/${event}/${sessionType}/${driver}`;
    if (lap !== undefined) {
      endpoint += `?lap=${lap}`;
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
      driver1,
      driver2,
    });
    if (lap1 !== undefined) params.append('lap1', lap1.toString());
    if (lap2 !== undefined) params.append('lap2', lap2.toString());

    const endpoint = `/api/telemetry/${year}/${event}/${sessionType}/compare?${params}`;
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
    let endpoint = `/api/laps/${year}/${event}/${sessionType}`;
    if (driver) {
      endpoint += `?driver=${driver}`;
    }
    return this.fetch<SessionLapsResponse>(endpoint, 60000);
  }

  /**
   * Get fastest laps from a session
   */
  async getFastestLaps(
    year: number,
    event: string | number,
    sessionType: SessionType,
    limit: number = 10
  ): Promise<FastestLapsResponse> {
    const endpoint = `/api/laps/${year}/${event}/${sessionType}/fastest?limit=${limit}`;
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
    const endpoint = `/api/laps/${year}/${event}/${sessionType}/driver/${driver}/analysis`;
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
    const endpoint = `/api/weather/${year}/${event}/${sessionType}`;
    return this.fetch<SessionWeatherResponse>(endpoint);
  }

  // ============================================================================
  // SESSIONS & EVENTS
  // ============================================================================

  /**
   * Get the event schedule for a season
   */
  async getSeasonSchedule(year: number): Promise<SeasonScheduleResponse> {
    const endpoint = `/api/sessions/${year}`;
    return this.fetch<SeasonScheduleResponse>(endpoint);
  }

  /**
   * Get information about a specific session
   */
  async getSessionInfo(
    year: number,
    event: string | number,
    sessionType: SessionType
  ): Promise<SessionInfoResponse> {
    const endpoint = `/api/sessions/${year}/${event}/${sessionType}/info`;
    return this.fetch<SessionInfoResponse>(endpoint, 60000);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const fastf1Client = new FastF1Client();
