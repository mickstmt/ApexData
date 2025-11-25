/**
 * Seed Script: Calendar 2025 - Complete Season
 *
 * Este script obtiene el calendario COMPLETO de la temporada 2025
 * desde la API de Jolpica F1 (incluyendo carreras futuras sin resultados)
 * y las inserta en nuestra base de datos.
 *
 * Uso: npx tsx prisma/seed-calendar-2025.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Base URL de Jolpica F1 API
const JOLPICA_BASE_URL = 'https://api.jolpi.ca/ergast/f1';

interface JolpicaCircuit {
  circuitId: string;
  circuitName: string;
  url: string;
  Location: {
    lat: string;
    long: string;
    locality: string;
    country: string;
  };
}

interface JolpicaRace {
  season: string;
  round: string;
  raceName: string;
  url: string;
  Circuit: JolpicaCircuit;
  date: string;
  time?: string;
}

async function fetchFullCalendar(year: number) {
  console.log(`\n🔍 Obteniendo calendario completo de la temporada ${year}...`);

  const url = `${JOLPICA_BASE_URL}/${year}.json`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const races = data.MRData.RaceTable.Races as JolpicaRace[];

    console.log(`✅ Se encontraron ${races.length} carreras programadas\n`);
    return races;
  } catch (error) {
    console.error(`❌ Error al obtener el calendario:`, error);
    throw error;
  }
}

async function ensureCircuitExists(jolpicaCircuit: JolpicaCircuit) {
  const existingCircuit = await prisma.circuit.findUnique({
    where: { circuitId: jolpicaCircuit.circuitId },
  });

  if (existingCircuit) {
    // Update if it has "Unknown" values or missing data
    if (
      existingCircuit.location === 'Unknown' ||
      existingCircuit.country === 'Unknown' ||
      !existingCircuit.url
    ) {
      console.log(`  🔄 Actualizando circuito: ${jolpicaCircuit.circuitName}`);
      return await prisma.circuit.update({
        where: { id: existingCircuit.id },
        data: {
          name: jolpicaCircuit.circuitName,
          location: jolpicaCircuit.Location.locality,
          country: jolpicaCircuit.Location.country,
          lat: parseFloat(jolpicaCircuit.Location.lat),
          lng: parseFloat(jolpicaCircuit.Location.long),
          url: jolpicaCircuit.url,
        },
      });
    }
    return existingCircuit;
  }

  console.log(`  ➕ Creando circuito: ${jolpicaCircuit.circuitName}`);

  return await prisma.circuit.create({
    data: {
      circuitId: jolpicaCircuit.circuitId,
      name: jolpicaCircuit.circuitName,
      location: jolpicaCircuit.Location.locality,
      country: jolpicaCircuit.Location.country,
      lat: parseFloat(jolpicaCircuit.Location.lat),
      lng: parseFloat(jolpicaCircuit.Location.long),
      url: jolpicaCircuit.url,
    },
  });
}

async function seedCalendar2025() {
  console.log('🚀 Iniciando seed del calendario completo 2025...\n');

  try {
    // 1. Obtener el calendario completo de 2025
    const races = await fetchFullCalendar(2025);

    let newRaces = 0;
    let existingRaces = 0;
    let updatedRaces = 0;

    // 2. Procesar cada carrera
    for (const race of races) {
      const year = parseInt(race.season);
      const round = parseInt(race.round);

      console.log(`\n📍 Procesando: ${race.raceName} (Round ${round})`);

      // Asegurar que el circuito exista con datos completos
      await ensureCircuitExists(race.Circuit);

      // Verificar si la carrera ya existe
      const existingRace = await prisma.race.findUnique({
        where: {
          year_round: { year, round },
        },
      });

      if (existingRace) {
        // Si existe, verificar si necesita actualización
        if (!existingRace.url || !existingRace.time) {
          console.log(`  🔄 Actualizando carrera existente`);
          await prisma.race.update({
            where: { id: existingRace.id },
            data: {
              raceName: race.raceName,
              date: new Date(race.date),
              time: race.time || null,
              url: race.url,
            },
          });
          updatedRaces++;
        } else {
          console.log(`  ⏭️  La carrera ya existe con datos completos`);
          existingRaces++;
        }
      } else {
        // Crear nueva carrera
        console.log(`  ➕ Creando nueva carrera`);
        await prisma.race.create({
          data: {
            year,
            round,
            raceName: race.raceName,
            date: new Date(race.date),
            time: race.time || null,
            url: race.url,
            circuitId: race.Circuit.circuitId,
          },
        });
        newRaces++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✨ Seed del calendario completado exitosamente!`);
    console.log(`📊 Total de carreras en el calendario: ${races.length}`);
    console.log(`➕ Nuevas carreras creadas: ${newRaces}`);
    console.log(`🔄 Carreras actualizadas: ${updatedRaces}`);
    console.log(`⏭️  Carreras ya existentes: ${existingRaces}`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el seed
seedCalendar2025()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
