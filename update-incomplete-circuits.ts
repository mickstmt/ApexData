import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Base URL de Jolpica F1 API
const JOLPICA_BASE_URL = 'https://api.jolpi.ca/ergast/f1';

interface CircuitLocation {
  lat: string;
  long: string;
  locality: string;
  country: string;
}

interface JolpicaCircuit {
  circuitId: string;
  circuitName: string;
  url: string;
  Location: CircuitLocation;
}

interface JolpicaRace {
  Circuit: JolpicaCircuit;
}

async function updateIncompleteCircuits() {
  console.log('\n🔄 Actualizando circuitos incompletos...\n');

  // Find circuits with "Unknown" data
  const incompleteCircuits = await prisma.circuit.findMany({
    where: {
      OR: [
        { location: 'Unknown' },
        { country: 'Unknown' },
      ],
    },
  });

  console.log(`📍 Encontrados ${incompleteCircuits.length} circuitos incompletos:\n`);
  incompleteCircuits.forEach(c => console.log(`   - ${c.circuitId}: ${c.name}`));

  // Fetch 2024 races to get complete circuit data
  console.log(`\n🔍 Obteniendo datos completos de la API...\n`);

  const circuitDataMap = new Map<string, JolpicaCircuit>();

  for (let round = 1; round <= 24; round++) {
    const url = `${JOLPICA_BASE_URL}/2024/${round}/results.json`;

    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();
      const races = data.MRData.RaceTable.Races as JolpicaRace[];

      if (races.length > 0) {
        const circuit = races[0].Circuit;
        circuitDataMap.set(circuit.circuitId, circuit);
      }
    } catch (error) {
      console.log(`  ⚠️  Error en ronda ${round}`);
      continue;
    }
  }

  console.log(`✅ Datos obtenidos para ${circuitDataMap.size} circuitos\n`);

  // Update each incomplete circuit
  let updated = 0;
  let notFound = 0;

  for (const circuit of incompleteCircuits) {
    const apiData = circuitDataMap.get(circuit.circuitId);

    if (!apiData) {
      console.log(`  ❌ ${circuit.circuitId}: No se encontró en la API`);
      notFound++;
      continue;
    }

    await prisma.circuit.update({
      where: { id: circuit.id },
      data: {
        name: apiData.circuitName,
        location: apiData.Location.locality,
        country: apiData.Location.country,
        lat: parseFloat(apiData.Location.lat),
        lng: parseFloat(apiData.Location.long),
        url: apiData.url,
      },
    });

    console.log(`  ✅ ${circuit.circuitId}: ${apiData.circuitName} (${apiData.Location.locality}, ${apiData.Location.country})`);
    updated++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✨ Actualización completada!`);
  console.log(`  ✅ Actualizados: ${updated}`);
  console.log(`  ❌ No encontrados: ${notFound}`);
  console.log('='.repeat(60) + '\n');

  await prisma.$disconnect();
}

updateIncompleteCircuits();
