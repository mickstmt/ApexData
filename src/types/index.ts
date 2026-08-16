/**
 * Type Definitions Exports
 * Central export point for all TypeScript types
 */

// API Types
export * from './api/jolpica';
export * from './api/openf1';
// SessionType comes from here ('FP1' | ... | 'R'); common.ts exposes the
// long-form names as SessionName so both can live in this barrel.
export * from './api/fastf1';

// Common Types
export * from './common';

// Re-export Prisma types for convenience
export type { Driver, Constructor, Circuit, Season, Race, Result, Qualifying, SprintResult, ConstructorStanding } from '@prisma/client';
