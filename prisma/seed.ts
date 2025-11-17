/**
 * Prisma Seed Script
 * Populates database with initial F1 data
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

// Inline Jolpica client for seeding
const JOLPICA_BASE_URL = 'https://api.jolpi.ca/ergast/f1';

async function fetchJolpica<T>(path: string): Promise<T> {
  const response = await fetch(`${JOLPICA_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Jolpica API error: ${response.status}`);
  }
  return response.json();
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================================================
  // SEED CIRCUITS
  // ============================================================================
  console.log('📍 Seeding circuits...');
  try {
    const response: any = await fetchJolpica('/circuits.json');
    const circuits = response.MRData.CircuitTable.Circuits;

    for (const circuit of circuits) {
      await prisma.circuit.upsert({
        where: { circuitId: circuit.circuitId },
        update: {
          name: circuit.circuitName,
          location: circuit.Location.locality,
          country: circuit.Location.country,
          lat: circuit.Location.lat ? parseFloat(circuit.Location.lat) : null,
          lng: circuit.Location.long ? parseFloat(circuit.Location.long) : null,
          url: circuit.url || null,
        },
        create: {
          circuitId: circuit.circuitId,
          name: circuit.circuitName,
          location: circuit.Location.locality,
          country: circuit.Location.country,
          lat: circuit.Location.lat ? parseFloat(circuit.Location.lat) : null,
          lng: circuit.Location.long ? parseFloat(circuit.Location.long) : null,
          url: circuit.url || null,
        },
      });
    }

    console.log(`✅ Seeded ${circuits.length} circuits\n`);
  } catch (error) {
    console.error('❌ Error seeding circuits:', error);
  }

  // ============================================================================
  // SEED SEASONS (Recent years)
  // ============================================================================
  console.log('📅 Seeding seasons...');
  try {
    const currentYear = new Date().getFullYear();
    const startYear = 2020;

    for (let year = startYear; year <= currentYear; year++) {
      await prisma.season.upsert({
        where: { year },
        update: {
          url: `https://en.wikipedia.org/wiki/${year}_Formula_One_World_Championship`,
        },
        create: {
          year,
          url: `https://en.wikipedia.org/wiki/${year}_Formula_One_World_Championship`,
        },
      });
    }

    console.log(`✅ Seeded ${currentYear - startYear + 1} seasons (${startYear}-${currentYear})\n`);
  } catch (error) {
    console.error('❌ Error seeding seasons:', error);
  }

  // ============================================================================
  // SEED CURRENT SEASON DATA
  // ============================================================================
  console.log('🏁 Seeding current season data...');
  try {
    const currentYear = new Date().getFullYear();

    // Drivers
    const driversResponse: any = await fetchJolpica(`/${currentYear}/drivers.json`);
    const drivers = driversResponse.MRData.DriverTable.Drivers;

    for (const driver of drivers) {
      await prisma.driver.upsert({
        where: { driverId: driver.driverId },
        update: {
          permanentNumber: driver.permanentNumber ? parseInt(driver.permanentNumber) : null,
          code: driver.code || null,
          givenName: driver.givenName,
          familyName: driver.familyName,
          dateOfBirth: driver.dateOfBirth ? new Date(driver.dateOfBirth) : null,
          nationality: driver.nationality,
          url: driver.url || null,
        },
        create: {
          driverId: driver.driverId,
          permanentNumber: driver.permanentNumber ? parseInt(driver.permanentNumber) : null,
          code: driver.code || null,
          givenName: driver.givenName,
          familyName: driver.familyName,
          dateOfBirth: driver.dateOfBirth ? new Date(driver.dateOfBirth) : null,
          nationality: driver.nationality,
          url: driver.url || null,
        },
      });
    }

    console.log(`✅ Seeded ${drivers.length} current drivers\n`);

    // Constructors
    const constructorsResponse: any = await fetchJolpica(`/${currentYear}/constructors.json`);
    const constructors = constructorsResponse.MRData.ConstructorTable.Constructors;

    for (const constructor of constructors) {
      await prisma.constructor.upsert({
        where: { constructorId: constructor.constructorId },
        update: {
          name: constructor.name,
          nationality: constructor.nationality,
          url: constructor.url || null,
        },
        create: {
          constructorId: constructor.constructorId,
          name: constructor.name,
          nationality: constructor.nationality,
          url: constructor.url || null,
        },
      });
    }

    console.log(`✅ Seeded ${constructors.length} current constructors\n`);
  } catch (error) {
    console.error('❌ Error seeding current season data:', error);
  }

  console.log('✨ Database seeding completed!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
