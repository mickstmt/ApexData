/**
 * Jolpica F1 API Type Definitions
 * Based on Ergast API schema (backwards compatible)
 * API URL: https://jolpi.ca/ergast/f1
 */

// ============================================================================
// BASE RESPONSE WRAPPER
// ============================================================================

export interface JolpicaResponse<T> {
  MRData: {
    xmlns: string;
    series: string;
    url: string;
    limit: string;
    offset: string;
    total: string;
  } & T;
}

// ============================================================================
// DRIVER TYPES
// ============================================================================

export interface JolpicaDriver {
  driverId: string; // e.g., "hamilton"
  permanentNumber?: string; // e.g., "44"
  code?: string; // e.g., "HAM"
  url: string; // Wikipedia URL
  givenName: string; // First name
  familyName: string; // Last name
  dateOfBirth: string; // ISO date string
  nationality: string; // e.g., "British"
}

export interface JolpicaDriverTable {
  DriverTable: {
    season?: string;
    Drivers: JolpicaDriver[];
  };
}

export type JolpicaDriversResponse = JolpicaResponse<JolpicaDriverTable>;

// ============================================================================
// CONSTRUCTOR (TEAM) TYPES
// ============================================================================

export interface JolpicaConstructor {
  constructorId: string; // e.g., "mercedes"
  url: string; // Wikipedia URL
  name: string; // e.g., "Mercedes"
  nationality: string; // e.g., "German"
}

export interface JolpicaConstructorTable {
  ConstructorTable: {
    season?: string;
    Constructors: JolpicaConstructor[];
  };
}

export type JolpicaConstructorsResponse = JolpicaResponse<JolpicaConstructorTable>;

// ============================================================================
// CIRCUIT TYPES
// ============================================================================

export interface JolpicaCircuit {
  circuitId: string; // e.g., "monaco"
  url: string; // Wikipedia URL
  circuitName: string; // e.g., "Circuit de Monaco"
  Location: {
    lat: string; // Latitude
    long: string; // Longitude
    locality: string; // City
    country: string; // Country
  };
}

export interface JolpicaCircuitTable {
  CircuitTable: {
    season?: string;
    Circuits: JolpicaCircuit[];
  };
}

export type JolpicaCircuitsResponse = JolpicaResponse<JolpicaCircuitTable>;

// ============================================================================
// SEASON TYPES
// ============================================================================

export interface JolpicaSeason {
  season: string; // Year as string, e.g., "2024"
  url: string; // Wikipedia URL
}

export interface JolpicaSeasonTable {
  SeasonTable: {
    Seasons: JolpicaSeason[];
  };
}

export type JolpicaSeasonsResponse = JolpicaResponse<JolpicaSeasonTable>;

// ============================================================================
// RACE TYPES
// ============================================================================

export interface JolpicaRace {
  season: string; // e.g., "2024"
  round: string; // e.g., "1"
  url: string; // Wikipedia URL
  raceName: string; // e.g., "Bahrain Grand Prix"
  Circuit: JolpicaCircuit;
  date: string; // ISO date
  time?: string; // UTC time
  // Optional session dates/times
  FirstPractice?: { date: string; time: string };
  SecondPractice?: { date: string; time: string };
  ThirdPractice?: { date: string; time: string };
  Qualifying?: { date: string; time: string };
  Sprint?: { date: string; time: string };
}

export interface JolpicaRaceTable {
  RaceTable: {
    season?: string;
    round?: string;
    Races: JolpicaRace[];
  };
}

export type JolpicaRacesResponse = JolpicaResponse<JolpicaRaceTable>;

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface JolpicaResult {
  number: string; // Car number
  position: string; // Final position
  positionText: string; // Position text (can be "R" for retired)
  points: string; // Points scored
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  grid: string; // Starting grid position
  laps: string; // Laps completed
  status: string; // e.g., "Finished", "Accident", "+1 Lap"
  Time?: { millis: string; time: string }; // Race time (winner only)
  FastestLap?: {
    rank: string;
    lap: string;
    Time: { time: string };
    AverageSpeed: { units: string; speed: string };
  };
}

export interface JolpicaRaceWithResults extends JolpicaRace {
  Results: JolpicaResult[];
}

export interface JolpicaResultsTable {
  RaceTable: {
    season?: string;
    round?: string;
    Races: JolpicaRaceWithResults[];
  };
}

export type JolpicaResultsResponse = JolpicaResponse<JolpicaResultsTable>;

// ============================================================================
// QUALIFYING TYPES
// ============================================================================

export interface JolpicaQualifyingResult {
  number: string;
  position: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  Q1?: string; // Q1 time
  Q2?: string; // Q2 time
  Q3?: string; // Q3 time
}

export interface JolpicaRaceWithQualifying extends JolpicaRace {
  QualifyingResults: JolpicaQualifyingResult[];
}

export interface JolpicaQualifyingTable {
  RaceTable: {
    season?: string;
    round?: string;
    Races: JolpicaRaceWithQualifying[];
  };
}

export type JolpicaQualifyingResponse = JolpicaResponse<JolpicaQualifyingTable>;

// ============================================================================
// STANDINGS TYPES
// ============================================================================

export interface JolpicaDriverStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: JolpicaDriver;
  Constructors: JolpicaConstructor[];
}

export interface JolpicaConstructorStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: JolpicaConstructor;
}

export interface JolpicaStandingsList {
  season: string;
  round: string;
  DriverStandings?: JolpicaDriverStanding[];
  ConstructorStandings?: JolpicaConstructorStanding[];
}

export interface JolpicaStandingsTable {
  StandingsTable: {
    season?: string;
    StandingsLists: JolpicaStandingsList[];
  };
}

export type JolpicaDriverStandingsResponse = JolpicaResponse<JolpicaStandingsTable>;
export type JolpicaConstructorStandingsResponse = JolpicaResponse<JolpicaStandingsTable>;

// ============================================================================
// SPRINT TYPES
// ============================================================================

export interface JolpicaSprintResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  grid: string;
  laps: string;
  status: string;
  Time?: { millis: string; time: string };
  FastestLap?: {
    lap: string;
    Time: { time: string };
  };
}

export interface JolpicaRaceWithSprint extends JolpicaRace {
  SprintResults: JolpicaSprintResult[];
}

export interface JolpicaSprintTable {
  RaceTable: {
    season?: string;
    round?: string;
    Races: JolpicaRaceWithSprint[];
  };
}

export type JolpicaSprintResponse = JolpicaResponse<JolpicaSprintTable>;

// ============================================================================
// PIT STOP TYPES
// ============================================================================

export interface JolpicaPitStop {
  driverId: string;
  lap: string;
  stop: string; // Stop number
  time: string; // Time of day
  duration: string; // Duration in seconds
}

export interface JolpicaRaceWithPitStops extends JolpicaRace {
  PitStops: JolpicaPitStop[];
}

export interface JolpicaPitStopTable {
  RaceTable: {
    season?: string;
    round?: string;
    Races: JolpicaRaceWithPitStops[];
  };
}

export type JolpicaPitStopsResponse = JolpicaResponse<JolpicaPitStopTable>;

// ============================================================================
// LAP TIMES TYPES
// ============================================================================

export interface JolpicaTiming {
  driverId: string;
  position: string;
  time: string;
}

export interface JolpicaLap {
  number: string; // Lap number
  Timings: JolpicaTiming[];
}

export interface JolpicaRaceWithLaps extends JolpicaRace {
  Laps: JolpicaLap[];
}

export interface JolpicaLapTable {
  RaceTable: {
    season?: string;
    round?: string;
    Races: JolpicaRaceWithLaps[];
  };
}

export type JolpicaLapsResponse = JolpicaResponse<JolpicaLapTable>;
