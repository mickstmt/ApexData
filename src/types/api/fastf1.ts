/**
 * FastF1 API Types
 * Types for the Python FastF1 microservice responses
 */

// ============================================================================
// TELEMETRY TYPES
// ============================================================================

export interface TelemetryPoint {
  Time: number;
  SessionTime?: number;
  Date?: string;
  Speed: number;
  RPM: number;
  nGear: number;
  Throttle: number;
  Brake: boolean;
  DRS: number;
  Source?: string;
  Distance?: number;
  RelativeDistance?: number;
  Status?: string;
  X?: number;
  Y?: number;
  Z?: number;
}

export interface DriverTelemetryResponse {
  driver: string;
  lap_number: number;
  lap_time: string;
  is_personal_best: boolean;
  compound: string | null;
  tyre_life: number | null;
  telemetry: TelemetryPoint[];
}

export interface TelemetryComparisonResponse {
  driver1: {
    code: string;
    lap_number: number;
    lap_time: string;
    compound: string | null;
    telemetry: TelemetryPoint[];
  };
  driver2: {
    code: string;
    lap_number: number;
    lap_time: string;
    compound: string | null;
    telemetry: TelemetryPoint[];
  };
  delta_time: string;
  /** Grados que hay que girar el trazado para verlo como en televisión. */
  rotation?: number;
}

// ============================================================================
// LAP TYPES
// ============================================================================

export interface LapData {
  Time?: string;
  Driver: string;
  DriverNumber: string;
  LapTime?: string;
  LapNumber: number;
  /** Posición en pista al cruzar la línea. La base de los gráficos de carrera. */
  Position?: number;
  Stint?: number;
  PitOutTime?: string;
  PitInTime?: string;
  Sector1Time?: string;
  Sector2Time?: string;
  Sector3Time?: string;
  Sector1SessionTime?: string;
  Sector2SessionTime?: string;
  Sector3SessionTime?: string;
  SpeedI1?: number;
  SpeedI2?: number;
  SpeedFL?: number;
  SpeedST?: number;
  IsPersonalBest?: boolean;
  Compound?: string;
  TyreLife?: number;
  FreshTyre?: boolean;
  Team?: string;
  TrackStatus?: string;
  IsAccurate?: boolean;
}

export interface SessionLapsResponse {
  session: {
    year: number;
    event: string;
    type: string;
    name: string;
    date: string;
  };
  total_laps: number;
  laps: LapData[];
}

export interface FastestLapsResponse {
  session: {
    year: number;
    event: string;
    type: string;
    name: string;
  };
  fastest_laps: LapData[];
}

export interface DriverLapAnalysisResponse {
  driver: string;
  team: string;
  total_laps: number;
  valid_laps: number;
  fastest_lap: {
    lap_number: number;
    time: string;
    compound: string | null;
    tyre_life: number | null;
  };
  average_lap_time: string | null;
  consistency: {
    std_deviation: string | null;
  };
  sectors: {
    sector1_best: string | null;
    sector2_best: string | null;
    sector3_best: string | null;
  };
  top_speeds: {
    speed_i1: number | null;
    speed_i2: number | null;
    speed_fl: number | null;
    speed_st: number | null;
  };
  tyre_stints: Record<string, unknown>;
}

// ============================================================================
// WEATHER TYPES
// ============================================================================

export interface WeatherDataPoint {
  Time: number;
  AirTemp: number;
  Humidity: number;
  Pressure: number;
  Rainfall: boolean;
  TrackTemp: number;
  WindDirection: number;
  WindSpeed: number;
}

export interface SessionWeatherResponse {
  session: {
    year: number;
    event: string;
    type: string;
    name: string;
  };
  weather_data: WeatherDataPoint[];
}

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface F1Event {
  RoundNumber: number;
  Country: string;
  Location: string;
  OfficialEventName: string;
  EventDate: string;
  EventName: string;
  EventFormat: string;
  Session1: string;
  Session1Date: string;
  Session1DateUtc: string;
  Session2: string;
  Session2Date: string;
  Session2DateUtc: string;
  Session3: string;
  Session3Date: string;
  Session3DateUtc: string;
  Session4: string;
  Session4Date: string;
  Session4DateUtc: string;
  Session5: string;
  Session5Date: string;
  Session5DateUtc: string;
  F1ApiSupport: boolean;
}

export interface SeasonScheduleResponse {
  year: number;
  total_events: number;
  events: F1Event[];
}

export interface SessionInfoResponse {
  session: {
    name: string;
    date: string;
    event: string;
    location: string;
    country: string;
  };
  results: Record<string, unknown>[];
}

/**
 * Una clasificación reconstruida a partir de los tiempos de la sesión.
 *
 * `segment` es el tramo en el que cada piloto quedó —SQ1, SQ2, SQ3—, y es lo
 * que hace que el orden sea el de verdad y no un simple orden por tiempo: quien
 * cae en el primer tramo va detrás de quien llegó al segundo aunque su vuelta
 * fuera mejor. Va a `null` para quien no marcó tiempo.
 */
export interface SessionClassificationEntry {
  position: number;
  driver: string;
  driverName: string;
  team: string | null;
  number: string | number | null;
  segment: number | null;
  time: string | null;
}

export interface SessionClassificationResponse {
  year: number;
  event: string;
  session: string;
  session_type: string;
  segments: number;
  /** Siempre cierto: las sanciones de parrilla se aplican después. */
  provisional: boolean;
  classification: SessionClassificationEntry[];
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export interface HealthCheckResponse {
  status: string;
  cache_enabled: boolean;
  cache_dir: string;
}

// ============================================================================
// SESSION TYPE ENUM
// ============================================================================

/**
 * Las sesiones que se le pueden pedir al servicio, en el orden en que ocurren.
 *
 * `SQ` —la clasificación al sprint— no estaba, y por eso una práctica o una
 * clasificación al sprint no tenían dónde llevar. No hacía falta tocar el
 * servicio: `f1_service.get_session` le pasa el código a FastF1 tal cual, y
 * FastF1 conoce `SQ` desde siempre. La restricción vivía entera aquí.
 */
export type SessionType = 'FP1' | 'FP2' | 'FP3' | 'SQ' | 'S' | 'Q' | 'R';

/** Un punto del trazado, con la velocidad a la que se pasó por él. */
export interface TrackPoint {
  x: number;
  y: number;
  speed: number;
  /** Metros recorridos de vuelta. Es lo que une el mapa con las trazas. */
  distance: number | null;
}

/**
 * Trazado del circuito coloreado por velocidad.
 *
 * Las coordenadas llegan como las graba FastF1: sin girar ni escalar. La
 * rotación viaja aparte porque quien dibuja es el único que sabe el tamaño del
 * lienzo.
 */
export interface TrackMapResponse {
  driver: string;
  lap_number: number;
  lap_time: string | null;
  /** Grados que hay que girar el trazado para verlo como en televisión. */
  rotation: number;
  min_speed: number;
  max_speed: number;
  points: TrackPoint[];
}

/** Un juego de neumáticos, desde que se monta hasta que se quita. */
export interface Stint {
  driver: string;
  stint: number;
  compound: string;
  start_lap: number;
  end_lap: number;
  laps: number;
}

export interface DriverStints {
  driver: string;
  stints: Stint[];
}

export interface StintsResponse {
  session: {
    year: number;
    event: string;
    name: string;
  };
  total_laps: number;
  /** En el orden en que terminaron, no alfabético. */
  drivers: DriverStints[];
}

// ============================================================================
// REPLAY: POSICIONES DE TODA LA CARRERA
// ============================================================================

/** Un coche en el replay, con lo que hace falta para pintarlo y contarle las vueltas. */
export interface PositionsDriver {
  /** El dorsal, que es la clave de FastF1. */
  number: string;
  code: string;
  name: string;
  team: string | null;
  /** El color que manda la F1 para el equipo, con `#`. */
  color: string | null;
  /**
   * Cuándo cruzó la meta cada vuelta, en segundos desde el inicio.
   *
   * Contar cuántos quedan atrás dice en qué vuelta va; el último es donde
   * termina su carrera, que para un retirado llega antes que para el resto.
   */
  laps: number[];
}

/** Un tramo de estado de pista: 1 verde, 2 amarilla, 4 SC, 5 roja, 6/7 VSC. */
export interface PositionsTrackStatus {
  status: string;
  start: number;
  end: number;
}

/**
 * El JSON pequeño del replay. Describe el bloque binario que viaja aparte:
 * cuántos instantes tiene, a qué ritmo, en qué orden van los pilotos.
 */
export interface PositionsMeta {
  session: {
    year: number;
    event: string;
    type: string;
    name: string;
  };
  timeline: {
    /** Segundos de sesión del primer instante. */
    start: number;
    /** Segundos entre instantes: 0,25. */
    step: number;
    count: number;
  };
  /** El valor que marca «este coche no tiene posición en este instante». */
  sinDato: number;
  totalLaps: number;
  /** Grados que hay que girar el trazado para verlo como en televisión. */
  rotation: number;
  /** En el orden en que van en el bloque binario. */
  drivers: PositionsDriver[];
  trackStatus: PositionsTrackStatus[];
  /** El trazado de referencia, sobre el que se proyecta cada coche. */
  track: TrackPoint[];
}
