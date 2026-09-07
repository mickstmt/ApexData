/**
 * API Configuration
 */

export const API_ENDPOINTS = {
  jolpica: {
    base: process.env.NEXT_PUBLIC_JOLPICA_API_URL || 'https://api.jolpi.ca/ergast/f1',
    drivers: (year?: number) =>
      year ? `${API_ENDPOINTS.jolpica.base}/${year}/drivers.json` : `${API_ENDPOINTS.jolpica.base}/drivers.json`,
    constructors: (year?: number) =>
      year
        ? `${API_ENDPOINTS.jolpica.base}/${year}/constructors.json`
        : `${API_ENDPOINTS.jolpica.base}/constructors.json`,
    circuits: () => `${API_ENDPOINTS.jolpica.base}/circuits.json`,
    seasons: () => `${API_ENDPOINTS.jolpica.base}/seasons.json`,
    currentStandings: () => `${API_ENDPOINTS.jolpica.base}/current/driverStandings.json`,
    lastRace: () => `${API_ENDPOINTS.jolpica.base}/current/last/results.json`,
  },
  openf1: {
    base: process.env.NEXT_PUBLIC_OPENF1_API_URL || 'https://api.openf1.org/v1',
    sessions: (year: number) => `${API_ENDPOINTS.openf1.base}/sessions?year=${year}`,
    /**
     * La clasificación de una sesión: puesto, dorsal, puntos y abandonos.
     *
     * Existe para las siete sesiones del fin de semana, prácticas incluidas —
     * que es justo lo que Jolpica no tiene—, y aparece cuando la sesión sale de
     * la ventana «en directo» de OpenF1: media hora después de terminar.
     */
    sessionResult: (sessionKey: number) =>
      `${API_ENDPOINTS.openf1.base}/session_result?session_key=${sessionKey}`,
    /** Nombre, código, equipo y color de cada piloto de una sesión. */
    drivers: (sessionKey: number) =>
      `${API_ENDPOINTS.openf1.base}/drivers?session_key=${sessionKey}`,
    carData: (sessionKey: number) => `${API_ENDPOINTS.openf1.base}/car_data?session_key=${sessionKey}`,
    weather: (sessionKey: number) => `${API_ENDPOINTS.openf1.base}/weather?session_key=${sessionKey}`,
  },
} as const;

export const API_CONFIG = {
  timeout: 10000, // 10 segundos
  retries: 3,
  retryDelay: 1000, // 1 segundo
} as const;
