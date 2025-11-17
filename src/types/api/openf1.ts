/**
 * OpenF1 API Type Definitions
 * Real-time and historical Formula 1 data (2023+)
 * API URL: https://api.openf1.org/v1
 */

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface OpenF1Session {
  session_key: number; // Unique session identifier
  session_name: string; // e.g., "Race", "Qualifying", "Practice 1"
  date_start: string; // ISO datetime
  date_end: string; // ISO datetime
  gmt_offset: string; // Timezone offset
  session_type: string; // e.g., "Race", "Qualifying"
  meeting_key: number; // Grand Prix event identifier
  location: string; // City
  country_name: string; // Country
  country_code: string; // ISO country code
  circuit_key: number; // Circuit identifier
  circuit_short_name: string; // e.g., "Monaco"
  year: number; // Season year
}

// ============================================================================
// DRIVER TYPES
// ============================================================================

export interface OpenF1Driver {
  session_key: number;
  driver_number: number; // Racing number
  broadcast_name: string; // Display name
  full_name: string; // Full name
  name_acronym: string; // Three-letter code (e.g., "HAM")
  team_name: string; // Constructor name
  team_colour: string; // Hex color code
  first_name: string;
  last_name: string;
  headshot_url?: string; // Profile image URL
  country_code: string; // ISO country code
}

// ============================================================================
// CAR DATA (TELEMETRY) TYPES
// ============================================================================

export interface OpenF1CarData {
  session_key: number;
  driver_number: number;
  date: string; // ISO datetime
  rpm: number; // Engine RPM
  speed: number; // Speed in km/h
  n_gear: number; // Current gear (0-8)
  throttle: number; // Throttle percentage (0-100)
  brake: boolean; // Brake status
  drs: number; // DRS status (0-14)
}

// ============================================================================
// POSITION TYPES
// ============================================================================

export interface OpenF1Position {
  session_key: number;
  driver_number: number;
  date: string; // ISO datetime
  position: number; // Current race position
}

// ============================================================================
// LOCATION (GPS) TYPES
// ============================================================================

export interface OpenF1Location {
  session_key: number;
  driver_number: number;
  date: string; // ISO datetime
  x: number; // X coordinate
  y: number; // Y coordinate
  z: number; // Z coordinate (elevation)
}

// ============================================================================
// INTERVAL TYPES
// ============================================================================

export interface OpenF1Interval {
  session_key: number;
  driver_number: number;
  date: string; // ISO datetime
  gap_to_leader: number; // Gap to leader in seconds
  interval: number; // Gap to car ahead in seconds
}

// ============================================================================
// LAP TYPES
// ============================================================================

export interface OpenF1Lap {
  session_key: number;
  driver_number: number;
  lap_number: number;
  date_start: string; // ISO datetime
  lap_duration: number; // Lap time in seconds
  is_pit_out_lap: boolean;
  duration_sector_1: number; // Sector 1 time in seconds
  duration_sector_2: number;
  duration_sector_3: number;
  segments_sector_1: number[];
  segments_sector_2: number[];
  segments_sector_3: number[];
  i1_speed?: number; // Intermediate 1 speed
  i2_speed?: number; // Intermediate 2 speed
  st_speed?: number; // Speed trap speed
}

// ============================================================================
// PIT STOP TYPES
// ============================================================================

export interface OpenF1Pit {
  session_key: number;
  driver_number: number;
  date: string; // ISO datetime
  lap_number: number;
  pit_duration: number; // Duration in seconds
}

// ============================================================================
// STINT TYPES (TIRE STRATEGY)
// ============================================================================

export interface OpenF1Stint {
  session_key: number;
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: string; // Tire compound: "SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"
  tyre_age_at_start: number; // Age of tires in laps
}

// ============================================================================
// RACE CONTROL TYPES
// ============================================================================

export interface OpenF1RaceControl {
  session_key: number;
  date: string; // ISO datetime
  category: string; // e.g., "Flag", "SafetyCar", "DRS"
  flag?: string; // Flag type: "YELLOW", "GREEN", "RED", "BLUE"
  lap_number: number;
  driver_number?: number;
  message: string; // Control message
  scope: string; // "Track", "Driver", "Sector"
  sector?: number; // Sector number (1-3)
}

// ============================================================================
// WEATHER TYPES
// ============================================================================

export interface OpenF1Weather {
  session_key: number;
  date: string; // ISO datetime
  air_temperature: number; // Celsius
  track_temperature: number; // Celsius
  humidity: number; // Percentage
  pressure: number; // mbar
  rainfall: boolean;
  wind_direction: number; // Degrees
  wind_speed: number; // m/s
}

// ============================================================================
// TEAM RADIO TYPES
// ============================================================================

export interface OpenF1TeamRadio {
  session_key: number;
  driver_number: number;
  date: string; // ISO datetime
  recording_url: string; // Audio file URL
}

// ============================================================================
// MEETING (GRAND PRIX EVENT) TYPES
// ============================================================================

export interface OpenF1Meeting {
  meeting_key: number;
  meeting_name: string; // e.g., "Monaco Grand Prix"
  meeting_official_name: string; // Official name
  location: string; // City
  country_name: string; // Country
  country_code: string; // ISO country code
  circuit_key: number;
  circuit_short_name: string;
  date_start: string; // ISO date
  gmt_offset: string;
  year: number;
}

// ============================================================================
// OVERTAKE TYPES (BETA)
// ============================================================================

export interface OpenF1Overtake {
  session_key: number;
  date: string; // ISO datetime
  driver_number: number; // Driver making the overtake
  opponent_number: number; // Driver being overtaken
  lap_number: number;
}

// ============================================================================
// SESSION RESULT TYPES (BETA)
// ============================================================================

export interface OpenF1SessionResult {
  session_key: number;
  driver_number: number;
  position: number;
  points?: number; // Championship points (if applicable)
  classified: boolean; // Whether driver was classified
  grid_position?: number; // Starting grid position
  team_name: string;
  full_name: string;
}

// ============================================================================
// STARTING GRID TYPES (BETA)
// ============================================================================

export interface OpenF1StartingGrid {
  session_key: number;
  driver_number: number;
  position: number; // Grid position
  team_name: string;
  full_name: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type OpenF1Compound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET';
export type OpenF1SessionType = 'Race' | 'Qualifying' | 'Sprint' | 'Practice 1' | 'Practice 2' | 'Practice 3';
export type OpenF1FlagType = 'YELLOW' | 'GREEN' | 'RED' | 'BLUE' | 'BLACK' | 'WHITE';
