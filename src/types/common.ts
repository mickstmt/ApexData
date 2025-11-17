/**
 * Common Types for ApexData
 */

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ============================================================================
// QUERY PARAMETERS
// ============================================================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface YearParams {
  year?: number;
}

export interface RoundParams extends YearParams {
  round?: number | 'last';
}

export interface DriverParams {
  driverId?: string;
  nationality?: string;
}

export interface ConstructorParams {
  constructorId?: string;
  nationality?: string;
}

export interface CircuitParams {
  circuitId?: string;
  country?: string;
}

// ============================================================================
// F1 ENUMS
// ============================================================================

export enum RaceStatus {
  FINISHED = 'Finished',
  ACCIDENT = 'Accident',
  COLLISION = 'Collision',
  ENGINE = 'Engine',
  GEARBOX = 'Gearbox',
  TRANSMISSION = 'Transmission',
  CLUTCH = 'Clutch',
  HYDRAULICS = 'Hydraulics',
  ELECTRICAL = 'Electrical',
  RETIRED = 'Retired',
  PLUS_ONE_LAP = '+1 Lap',
  PLUS_TWO_LAPS = '+2 Laps',
  DISQUALIFIED = 'Disqualified',
  NOT_CLASSIFIED = 'Not Classified',
  WITHDRAWN = 'Withdrawn',
}

export enum SessionType {
  RACE = 'Race',
  QUALIFYING = 'Qualifying',
  SPRINT = 'Sprint',
  SPRINT_QUALIFYING = 'Sprint Qualifying',
  PRACTICE_1 = 'Practice 1',
  PRACTICE_2 = 'Practice 2',
  PRACTICE_3 = 'Practice 3',
}

export enum TireCompound {
  SOFT = 'SOFT',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  INTERMEDIATE = 'INTERMEDIATE',
  WET = 'WET',
}

// ============================================================================
// DATE/TIME HELPERS
// ============================================================================

export interface RaceWeekend {
  fp1?: Date;
  fp2?: Date;
  fp3?: Date;
  qualifying?: Date;
  sprint?: Date;
  race: Date;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface DriverStatistics {
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  championships: number;
  races: number;
  points: number;
}

export interface ConstructorStatistics {
  wins: number;
  podiums: number;
  poles: number;
  championships: number;
  races: number;
  points: number;
}

export interface CircuitStatistics {
  races: number;
  firstRace: number; // Year
  lastRace?: number; // Year (undefined if current)
  lapRecord?: {
    time: string;
    driver: string;
    year: number;
  };
}

// ============================================================================
// COMPARISON TYPES
// ============================================================================

export interface DriverComparison {
  driver1: {
    driverId: string;
    name: string;
    stats: DriverStatistics;
  };
  driver2: {
    driverId: string;
    name: string;
    stats: DriverStatistics;
  };
}

// ============================================================================
// CACHE TYPES
// ============================================================================

export interface CacheMetadata {
  cachedAt: Date;
  expiresAt?: Date;
  source: 'database' | 'api';
}

export interface CachedData<T> {
  data: T;
  metadata: CacheMetadata;
}
