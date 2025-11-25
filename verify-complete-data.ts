import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyCompleteData() {
  console.log('\n🔍 Verificando integridad de datos...\n');

  // Check circuits
  console.log('📍 CIRCUITOS:');
  const circuits = await prisma.circuit.findMany({
    orderBy: { circuitId: 'asc' },
  });

  let incompleteCircuits = 0;
  circuits.forEach((circuit) => {
    const isComplete = circuit.location !== 'Unknown' &&
                      circuit.country !== 'Unknown' &&
                      circuit.lat !== null &&
                      circuit.lng !== null &&
                      circuit.url !== null;

    if (!isComplete) {
      console.log(`  ❌ ${circuit.circuitId}: ${circuit.name} - INCOMPLETO`);
      console.log(`     Location: ${circuit.location}, Country: ${circuit.country}`);
      console.log(`     Coords: ${circuit.lat}, ${circuit.lng}, URL: ${circuit.url ? 'Sí' : 'No'}`);
      incompleteCircuits++;
    } else {
      console.log(`  ✅ ${circuit.circuitId}: ${circuit.name}`);
    }
  });

  console.log(`\n  Total: ${circuits.length} circuitos`);
  console.log(`  Completos: ${circuits.length - incompleteCircuits}`);
  console.log(`  Incompletos: ${incompleteCircuits}`);

  // Check races
  console.log('\n\n🏁 CARRERAS 2024:');
  const races = await prisma.race.findMany({
    where: { year: 2024 },
    orderBy: { round: 'asc' },
    include: { circuit: true },
  });

  let racesWithoutUrl = 0;
  let racesWithoutTime = 0;

  races.forEach((race) => {
    const hasUrl = race.url !== null;
    const hasTime = race.time !== null;

    if (!hasUrl || !hasTime) {
      console.log(`  ⚠️  Round ${race.round}: ${race.raceName}`);
      if (!hasUrl) console.log(`     ❌ Sin URL`);
      if (!hasTime) console.log(`     ❌ Sin hora`);
      if (!hasUrl) racesWithoutUrl++;
      if (!hasTime) racesWithoutTime++;
    } else {
      console.log(`  ✅ Round ${race.round}: ${race.raceName} (${race.time})`);
    }
  });

  console.log(`\n  Total: ${races.length} carreras`);
  console.log(`  Con URL: ${races.length - racesWithoutUrl}`);
  console.log(`  Con hora: ${races.length - racesWithoutTime}`);

  // Check drivers
  console.log('\n\n👤 PILOTOS:');
  const drivers = await prisma.driver.findMany({
    orderBy: { familyName: 'asc' },
  });

  const driversWithoutUrl = drivers.filter(d => !d.url).length;
  console.log(`  Total: ${drivers.length} pilotos`);
  console.log(`  Con URL: ${drivers.length - driversWithoutUrl}`);
  console.log(`  Sin URL: ${driversWithoutUrl}`);

  if (driversWithoutUrl > 0) {
    console.log('\n  Pilotos sin URL:');
    drivers.filter(d => !d.url).forEach(d => {
      console.log(`    - ${d.givenName} ${d.familyName}`);
    });
  }

  // Check constructors
  console.log('\n\n🏎️  CONSTRUCTORES:');
  const constructors = await prisma.constructor.findMany({
    orderBy: { name: 'asc' },
  });

  const constructorsWithoutUrl = constructors.filter(c => !c.url).length;
  console.log(`  Total: ${constructors.length} constructores`);
  console.log(`  Con URL: ${constructors.length - constructorsWithoutUrl}`);
  console.log(`  Sin URL: ${constructorsWithoutUrl}`);

  if (constructorsWithoutUrl > 0) {
    console.log('\n  Constructores sin URL:');
    constructors.filter(c => !c.url).forEach(c => {
      console.log(`    - ${c.name}`);
    });
  }

  console.log('\n' + '='.repeat(60) + '\n');

  await prisma.$disconnect();
}

verifyCompleteData();
