/**
 * Jolpica Data Transformers
 * Convert Jolpica API responses to Prisma models
 */

import type { JolpicaDriver, JolpicaConstructor, JolpicaCircuit, JolpicaRace } from '@/types';
import type { Prisma } from '@prisma/client';

// ============================================================================
// DRIVER TRANSFORMER
// ============================================================================

export function transformDriver(jolpicaDriver: JolpicaDriver): Prisma.DriverCreateInput {
  return {
    driverId: jolpicaDriver.driverId,
    permanentNumber: jolpicaDriver.permanentNumber ? parseInt(jolpicaDriver.permanentNumber) : null,
    code: jolpicaDriver.code || null,
    givenName: jolpicaDriver.givenName,
    familyName: jolpicaDriver.familyName,
    dateOfBirth: jolpicaDriver.dateOfBirth ? new Date(jolpicaDriver.dateOfBirth) : null,
    nationality: jolpicaDriver.nationality,
    url: jolpicaDriver.url || null,
    imageUrl: null, // Will be populated separately if needed
  };
}

// ============================================================================
// CONSTRUCTOR TRANSFORMER
// ============================================================================

export function transformConstructor(jolpicaConstructor: JolpicaConstructor): Prisma.ConstructorCreateInput {
  return {
    constructorId: jolpicaConstructor.constructorId,
    name: jolpicaConstructor.name,
    nationality: jolpicaConstructor.nationality,
    url: jolpicaConstructor.url || null,
    logoUrl: null, // Will be populated separately if needed
  };
}

// ============================================================================
// CIRCUIT TRANSFORMER
// ============================================================================

export function transformCircuit(jolpicaCircuit: JolpicaCircuit): Prisma.CircuitCreateInput {
  return {
    circuitId: jolpicaCircuit.circuitId,
    name: jolpicaCircuit.circuitName,
    location: jolpicaCircuit.Location.locality,
    country: jolpicaCircuit.Location.country,
    lat: jolpicaCircuit.Location.lat ? parseFloat(jolpicaCircuit.Location.lat) : null,
    lng: jolpicaCircuit.Location.long ? parseFloat(jolpicaCircuit.Location.long) : null,
    alt: null, // Not provided by Jolpica
    url: jolpicaCircuit.url || null,
    // Additional fields will be populated separately
    length: null,
    corners: null,
    drsZones: null,
    lapRecord: null,
    lapRecordYear: null,
  };
}

// ============================================================================
// SEASON TRANSFORMER
// ============================================================================

export function transformSeason(year: string): Prisma.SeasonCreateInput {
  return {
    year: parseInt(year),
    url: `https://en.wikipedia.org/wiki/${year}_Formula_One_World_Championship`,
  };
}

// ============================================================================
// RACE TRANSFORMER
// ============================================================================

export function transformRace(jolpicaRace: JolpicaRace): Omit<Prisma.RaceCreateInput, 'season' | 'circuit'> & {
  year: number;
  circuitId: string;
} {
  return {
    raceId: `${jolpicaRace.season}_${jolpicaRace.round}`,
    year: parseInt(jolpicaRace.season),
    round: parseInt(jolpicaRace.round),
    raceName: jolpicaRace.raceName,
    date: new Date(jolpicaRace.date),
    time: jolpicaRace.time || null,

    // Session dates/times
    fp1Date: jolpicaRace.FirstPractice?.date ? new Date(jolpicaRace.FirstPractice.date) : null,
    fp1Time: jolpicaRace.FirstPractice?.time || null,
    fp2Date: jolpicaRace.SecondPractice?.date ? new Date(jolpicaRace.SecondPractice.date) : null,
    fp2Time: jolpicaRace.SecondPractice?.time || null,
    fp3Date: jolpicaRace.ThirdPractice?.date ? new Date(jolpicaRace.ThirdPractice.date) : null,
    fp3Time: jolpicaRace.ThirdPractice?.time || null,
    qualiDate: jolpicaRace.Qualifying?.date ? new Date(jolpicaRace.Qualifying.date) : null,
    qualiTime: jolpicaRace.Qualifying?.time || null,
    sprintDate: jolpicaRace.Sprint?.date ? new Date(jolpicaRace.Sprint.date) : null,
    sprintTime: jolpicaRace.Sprint?.time || null,

    url: jolpicaRace.url || null,
    circuitId: jolpicaRace.Circuit.circuitId,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse time string to milliseconds
 * Format: "1:23:45.678" or "+1 Lap"
 */
export function parseTimeToMillis(timeString: string): bigint | null {
  if (!timeString || timeString.startsWith('+') || timeString === 'Retired') {
    return null;
  }

  try {
    const parts = timeString.split(':');

    if (parts.length === 3) {
      // Format: "1:23:45.678"
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const seconds = parseFloat(parts[2]);

      const totalMillis = (hours * 3600 + minutes * 60 + seconds) * 1000;
      return BigInt(Math.round(totalMillis));
    } else if (parts.length === 2) {
      // Format: "1:23.456"
      const minutes = parseInt(parts[0]);
      const seconds = parseFloat(parts[1]);

      const totalMillis = (minutes * 60 + seconds) * 1000;
      return BigInt(Math.round(totalMillis));
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract status ID from status string
 * This is a simplified version - in production you'd want a proper mapping
 */
export function getStatusId(status: string): number {
  const statusMap: Record<string, number> = {
    'Finished': 1,
    '+1 Lap': 11,
    '+2 Laps': 12,
    'Accident': 3,
    'Collision': 4,
    'Engine': 5,
    'Gearbox': 6,
    'Transmission': 7,
    'Clutch': 8,
    'Hydraulics': 9,
    'Electrical': 10,
    'Retired': 2,
    'Disqualified': 2,
    'Not Classified': 13,
    'Withdrawn': 14,
  };

  return statusMap[status] || 2; // Default to "Retired"
}
