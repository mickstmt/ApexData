import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIncompleteCircuits() {
  console.log('\n🔍 Verificando circuitos incompletos...\n');

  const incompleteCircuits = await prisma.circuit.findMany({
    where: {
      OR: [
        { location: 'Unknown' },
        { country: 'Unknown' },
      ],
    },
  });

  if (incompleteCircuits.length === 0) {
    console.log('✅ No hay circuitos incompletos. Todos tienen datos completos!\n');
  } else {
    console.log(`⚠️  Encontrados ${incompleteCircuits.length} circuitos incompletos:\n`);
    incompleteCircuits.forEach((circuit) => {
      console.log(`   - ${circuit.circuitId}: ${circuit.name}`);
      console.log(`     Ubicación: ${circuit.location}`);
      console.log(`     País: ${circuit.country}\n`);
    });
  }

  await prisma.$disconnect();
}

checkIncompleteCircuits();
