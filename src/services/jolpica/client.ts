/**
 * Jolpica F1 API Client
 * Service to interact with Jolpica F1 API
 */

import { API_ENDPOINTS, API_CONFIG } from '@/config';
import type {
  JolpicaDriversResponse,
  JolpicaConstructorsResponse,
  JolpicaCircuitsResponse,
  JolpicaSeasonsResponse,
  JolpicaRacesResponse,
  JolpicaResultsResponse,
  JolpicaQualifyingResponse,
  JolpicaDriverStandingsResponse,
  JolpicaConstructorStandingsResponse,
  JolpicaSprintResponse,
} from '@/types';

// ============================================================================
// CLIENT CLASS
// ============================================================================

class JolpicaClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_ENDPOINTS.jolpica.base;
    this.timeout = API_CONFIG.timeout;
  }

  /**
   * Generic fetch method with error handling
   */
  private async fetch<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Jolpica API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
        throw error;
      }

      throw new Error('Unknown error occurred');
    }
  }

  // ============================================================================
  // DRIVERS
  // ============================================================================

  /**
   * Get all drivers
   * @param year - Optional year filter
   * @param limit - Optional limit
   * @param offset - Optional offset
   */
  async getDrivers(params?: { year?: number; limit?: number; offset?: number }): Promise<JolpicaDriversResponse> {
    let url = `${this.baseURL}`;

    if (params?.year) {
      url += `/${params.year}`;
    }

    url += '/drivers.json';

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    return this.fetch<JolpicaDriversResponse>(url);
  }

  /**
   * Get driver by ID
   */
  async getDriver(driverId: string, year?: number): Promise<JolpicaDriversResponse> {
    let url = `${this.baseURL}`;

    if (year) {
      url += `/${year}`;
    }

    url += `/drivers/${driverId}.json`;

    return this.fetch<JolpicaDriversResponse>(url);
  }

  // ============================================================================
  // CONSTRUCTORS
  // ============================================================================

  /**
   * Get all constructors
   */
  async getConstructors(params?: { year?: number; limit?: number; offset?: number }): Promise<JolpicaConstructorsResponse> {
    let url = `${this.baseURL}`;

    if (params?.year) {
      url += `/${params.year}`;
    }

    url += '/constructors.json';

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    return this.fetch<JolpicaConstructorsResponse>(url);
  }

  /**
   * Get constructor by ID
   */
  async getConstructor(constructorId: string, year?: number): Promise<JolpicaConstructorsResponse> {
    let url = `${this.baseURL}`;

    if (year) {
      url += `/${year}`;
    }

    url += `/constructors/${constructorId}.json`;

    return this.fetch<JolpicaConstructorsResponse>(url);
  }

  // ============================================================================
  // CIRCUITS
  // ============================================================================

  /**
   * Get all circuits
   */
  async getCircuits(params?: { year?: number; limit?: number; offset?: number }): Promise<JolpicaCircuitsResponse> {
    let url = `${this.baseURL}`;

    if (params?.year) {
      url += `/${params.year}`;
    }

    url += '/circuits.json';

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    return this.fetch<JolpicaCircuitsResponse>(url);
  }

  /**
   * Get circuit by ID
   */
  async getCircuit(circuitId: string): Promise<JolpicaCircuitsResponse> {
    const url = `${this.baseURL}/circuits/${circuitId}.json`;
    return this.fetch<JolpicaCircuitsResponse>(url);
  }

  // ============================================================================
  // SEASONS
  // ============================================================================

  /**
   * Get all seasons
   */
  async getSeasons(params?: { limit?: number; offset?: number }): Promise<JolpicaSeasonsResponse> {
    let url = `${this.baseURL}/seasons.json`;

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    return this.fetch<JolpicaSeasonsResponse>(url);
  }

  // ============================================================================
  // RACES (CALENDAR)
  // ============================================================================

  /**
   * Get races for a season
   */
  async getRaces(year: number | 'current'): Promise<JolpicaRacesResponse> {
    const url = `${this.baseURL}/${year}.json`;
    return this.fetch<JolpicaRacesResponse>(url);
  }

  /**
   * Get specific race
   */
  async getRace(year: number | 'current', round: number | 'last'): Promise<JolpicaRacesResponse> {
    const url = `${this.baseURL}/${year}/${round}.json`;
    return this.fetch<JolpicaRacesResponse>(url);
  }

  // ============================================================================
  // RESULTS
  // ============================================================================

  /**
   * Get race results
   */
  async getResults(year: number | 'current', round: number | 'last'): Promise<JolpicaResultsResponse> {
    const url = `${this.baseURL}/${year}/${round}/results.json`;
    return this.fetch<JolpicaResultsResponse>(url);
  }

  /**
   * Get all results for a driver in a season
   */
  async getDriverResults(driverId: string, year: number | 'current'): Promise<JolpicaResultsResponse> {
    const url = `${this.baseURL}/${year}/drivers/${driverId}/results.json`;
    return this.fetch<JolpicaResultsResponse>(url);
  }

  /**
   * Get all results for a constructor in a season
   */
  async getConstructorResults(constructorId: string, year: number | 'current'): Promise<JolpicaResultsResponse> {
    const url = `${this.baseURL}/${year}/constructors/${constructorId}/results.json`;
    return this.fetch<JolpicaResultsResponse>(url);
  }

  // ============================================================================
  // QUALIFYING
  // ============================================================================

  /**
   * Get qualifying results
   */
  async getQualifying(year: number | 'current', round: number | 'last'): Promise<JolpicaQualifyingResponse> {
    const url = `${this.baseURL}/${year}/${round}/qualifying.json`;
    return this.fetch<JolpicaQualifyingResponse>(url);
  }

  // ============================================================================
  // SPRINT
  // ============================================================================

  /**
   * Get sprint results
   */
  async getSprint(year: number | 'current', round: number | 'last'): Promise<JolpicaSprintResponse> {
    const url = `${this.baseURL}/${year}/${round}/sprint.json`;
    return this.fetch<JolpicaSprintResponse>(url);
  }

  // ============================================================================
  // STANDINGS
  // ============================================================================

  /**
   * Get driver standings
   */
  async getDriverStandings(year: number | 'current', round?: number | 'last'): Promise<JolpicaDriverStandingsResponse> {
    let url = `${this.baseURL}/${year}`;

    if (round) {
      url += `/${round}`;
    }

    url += '/driverStandings.json';

    return this.fetch<JolpicaDriverStandingsResponse>(url);
  }

  /**
   * Get constructor standings
   */
  async getConstructorStandings(year: number | 'current', round?: number | 'last'): Promise<JolpicaConstructorStandingsResponse> {
    let url = `${this.baseURL}/${year}`;

    if (round) {
      url += `/${round}`;
    }

    url += '/constructorStandings.json';

    return this.fetch<JolpicaConstructorStandingsResponse>(url);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const jolpicaClient = new JolpicaClient();
