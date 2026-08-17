import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyQualifyingData() {
  console.log('='.repeat(60));
  console.log('📊 VERIFICACIÓN DE DATOS DE QUALIFYING');
  console.log('='.repeat(60));

  try {
    // Count total qualifying records
    const total = await prisma.qualifying.count();

    // Count by year
    const by2023 = await prisma.qualifying.count({
      where: { race: { year: 2023 } }
    });

    const by2024 = await prisma.qualifying.count({
      where: { race: { year: 2024 } }
    });

    const by2025 = await prisma.qualifying.count({
      where: { race: { year: 2025 } }
    });

    console.log(`\nTotal de registros qualifying: ${total}`);
    console.log(`  - 2023: ${by2023} registros`);
    console.log(`  - 2024: ${by2024} registros`);
    console.log(`  - 2025: ${by2025} registros`);
    console.log('='.repeat(60));

    // Get a sample record from 2024
    const sample = await prisma.qualifying.findFirst({
      where: { race: { year: 2024 } },
      include: {
        driver: true,
        race: true,
        team: true
      }
    });

    if (sample) {
      console.log('\n📝 Ejemplo de registro (2024):');
      console.log(`  Carrera: ${sample.race.raceName} (Round ${sample.race.round})`);
      console.log(`  Piloto: ${sample.driver.givenName} ${sample.driver.familyName}`);
      console.log(`  Constructor: ${sample.team.name}`);
      console.log(`  Posición: P${sample.position}`);
      console.log(`  Q1: ${sample.q1 || 'N/A'}`);
      console.log(`  Q2: ${sample.q2 || 'N/A'}`);
      console.log(`  Q3: ${sample.q3 || 'N/A'}`);
      console.log('='.repeat(60));
    }

    // Get pole position from latest 2024 race
    const polePosition = await prisma.qualifying.findFirst({
      where: {
        race: { year: 2024 },
        position: 1
      },
      include: {
        driver: true,
        race: true,
        team: true
      },
      orderBy: {
        race: { round: 'desc' }
      }
    });

    if (polePosition) {
      console.log('\n🏁 Última pole position 2024:');
      console.log(`  Carrera: ${polePosition.race.raceName}`);
      console.log(`  Piloto: ${polePosition.driver.givenName} ${polePosition.driver.familyName}`);
      console.log(`  Constructor: ${polePosition.team.name}`);
      console.log(`  Q3 Time: ${polePosition.q3}`);
      console.log('='.repeat(60));
    }

    console.log('\n✅ Verificación completada exitosamente!\n');
  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyQualifyingData()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
