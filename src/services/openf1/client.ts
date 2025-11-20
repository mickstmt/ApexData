/**
 * OpenF1 API Client
 * Handles all communication with OpenF1 API for telemetry and real-time data
 * API Docs: https://openf1.org/
 */

import type {
  OpenF1Session,
  OpenF1Driver,
  OpenF1CarData,
  OpenF1Lap,
  OpenF1Position,
  OpenF1Interval,
  OpenF1Location,
  OpenF1Pit,
  OpenF1Stint,
  OpenF1Weather,
  OpenF1TeamRadio,
  OpenF1RaceControl,
  OpenF1Meeting,
} from '@/types/api/openf1';

const OPENF1_BASE_URL = 'https://api.openf1.org/v1';

/**
 * Base fetch function with error handling and retry logic
 */
async function fetchOpenF1<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(`${OPENF1_BASE_URL}${endpoint}`);

  // Add query parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  try {
    const response = await fetch(url.toString(), {
      next: { revalidate: 300 }, // Cache for 5 minutes to reduce API calls
    });

    if (!response.ok) {
      // Return empty array for rate limit errors instead of throwing
      if (response.status === 429) {
        console.warn('OpenF1 API rate limit reached, returning empty data');
        return [] as T;
      }
      throw new Error(`OpenF1 API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching OpenF1 data from ${endpoint}:`, error);
    // Return empty array instead of throwing to prevent page crashes
    return [] as T;
  }
}

/**
 * Get all available sessions or filter by parameters
 */
export async function getSessions(params?: {
  session_key?: number;
  year?: number;
  country_name?: string;
  session_name?: string;
}): Promise<OpenF1Session[]> {
  return fetchOpenF1('/sessions', params);
}

/**
 * Get the latest session
 */
export async function getLatestSession(): Promise<OpenF1Session | null> {
  const sessions = await getSessions();
  if (sessions.length === 0) return null;

  // Sort by date_start descending and return the most recent
  return sessions.sort((a, b) =>
    new Date(b.date_start).getTime() - new Date(a.date_start).getTime()
  )[0];
}

/**
 * Get drivers for a specific session
 */
export async function getDrivers(sessionKey: number): Promise<OpenF1Driver[]> {
  return fetchOpenF1('/drivers', { session_key: sessionKey });
}

/**
 * Get car telemetry data
 */
export async function getCarData(params: {
  session_key: number;
  driver_number?: number;
  date_start?: string;
  date_end?: string;
}): Promise<OpenF1CarData[]> {
  return fetchOpenF1('/car_data', params);
}

/**
 * Get lap times for a session
 */
export async function getLaps(params: {
  session_key: number;
  driver_number?: number;
  lap_number?: number;
}): Promise<OpenF1Lap[]> {
  return fetchOpenF1('/laps', params);
}

/**
 * Get position data (race positions over time)
 */
export async function getPositions(params: {
  session_key: number;
  driver_number?: number;
}): Promise<OpenF1Position[]> {
  return fetchOpenF1('/position', params);
}

/**
 * Get interval data (gaps between drivers)
 */
export async function getIntervals(params: {
  session_key: number;
  driver_number?: number;
}): Promise<OpenF1Interval[]> {
  return fetchOpenF1('/intervals', params);
}

/**
 * Get GPS location data
 */
export async function getLocation(params: {
  session_key: number;
  driver_number?: number;
}): Promise<OpenF1Location[]> {
  return fetchOpenF1('/location', params);
}

/**
 * Get pit stop data
 */
export async function getPitStops(params: {
  session_key: number;
  driver_number?: number;
}): Promise<OpenF1Pit[]> {
  return fetchOpenF1('/pit', params);
}

/**
 * Get tire stint data
 */
export async function getStints(params: {
  session_key: number;
  driver_number?: number;
}): Promise<OpenF1Stint[]> {
  return fetchOpenF1('/stints', params);
}

/**
 * Get weather data
 */
export async function getWeather(sessionKey: number): Promise<OpenF1Weather[]> {
  return fetchOpenF1('/weather', { session_key: sessionKey });
}

/**
 * Get team radio messages
 */
export async function getTeamRadio(params: {
  session_key: number;
  driver_number?: number;
}): Promise<OpenF1TeamRadio[]> {
  return fetchOpenF1('/team_radio', params);
}

/**
 * Get race control messages (flags, safety car, etc.)
 */
export async function getRaceControl(sessionKey: number): Promise<OpenF1RaceControl[]> {
  return fetchOpenF1('/race_control', { session_key: sessionKey });
}

/**
 * Get meeting (Grand Prix event) data
 */
export async function getMeetings(params?: {
  meeting_key?: number;
  year?: number;
  country_name?: string;
}): Promise<OpenF1Meeting[]> {
  return fetchOpenF1('/meetings', params);
}

/**
 * Get fastest lap for a driver in a session
 */
export async function getFastestLap(
  sessionKey: number,
  driverNumber: number
): Promise<OpenF1Lap | null> {
  const laps = await getLaps({ session_key: sessionKey, driver_number: driverNumber });

  if (laps.length === 0) return null;

  // Filter out invalid laps and find the fastest
  const validLaps = laps.filter(lap => lap.lap_duration && !lap.is_pit_out_lap);

  if (validLaps.length === 0) return null;

  return validLaps.reduce((fastest, current) =>
    (current.lap_duration || Infinity) < (fastest.lap_duration || Infinity) ? current : fastest
  );
}

/**
 * Get telemetry comparison for two drivers
 */
export async function compareTelemetry(
  sessionKey: number,
  driver1Number: number,
  driver2Number: number,
  lapNumber?: number
): Promise<{
  driver1: OpenF1CarData[];
  driver2: OpenF1CarData[];
}> {
  const [driver1Data, driver2Data] = await Promise.all([
    getCarData({ session_key: sessionKey, driver_number: driver1Number }),
    getCarData({ session_key: sessionKey, driver_number: driver2Number }),
  ]);

  return {
    driver1: driver1Data,
    driver2: driver2Data,
  };
}

/**
 * Get complete session summary (drivers, weather, race control)
 */
export async function getSessionSummary(sessionKey: number) {
  try {
    const [session, drivers, weather, raceControl] = await Promise.all([
      getSessions({ session_key: sessionKey }).then(s => s[0]),
      getDrivers(sessionKey),
      getWeather(sessionKey).catch(() => []),
      getRaceControl(sessionKey).catch(() => []),
    ]);

    return {
      session,
      drivers,
      weather: weather[weather.length - 1] || null, // Latest weather
      raceControl,
    };
  } catch (error) {
    console.error('Error fetching session summary:', error);
    throw error;
  }
}

/**
 * Get driver performance summary for a session
 */
export async function getDriverPerformance(sessionKey: number, driverNumber: number) {
  try {
    const [laps, pitStops, stints, fastestLap] = await Promise.all([
      getLaps({ session_key: sessionKey, driver_number: driverNumber }),
      getPitStops({ session_key: sessionKey, driver_number: driverNumber }),
      getStints({ session_key: sessionKey, driver_number: driverNumber }),
      getFastestLap(sessionKey, driverNumber),
    ]);

    // Calculate average lap time (excluding pit laps and invalid laps)
    const validLaps = laps.filter(lap => lap.lap_duration && !lap.is_pit_out_lap);
    const avgLapTime = validLaps.length > 0
      ? validLaps.reduce((sum, lap) => sum + (lap.lap_duration || 0), 0) / validLaps.length
      : null;

    return {
      laps,
      pitStops,
      stints,
      fastestLap,
      avgLapTime,
      totalLaps: laps.length,
      totalPitStops: pitStops.length,
    };
  } catch (error) {
    console.error('Error fetching driver performance:', error);
    throw error;
  }
}
