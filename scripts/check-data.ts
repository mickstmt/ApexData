import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking Database Data ===\n');

  // Check seasons
  const seasons = await prisma.season.findMany({
    orderBy: { year: 'desc' },
  });
  console.log(`📅 Seasons in database: ${seasons.length}`);
  seasons.forEach((s) => console.log(`  - ${s.year}`));

  // Check races per season
  console.log('\n🏁 Races per season:');
  for (const season of seasons) {
    const raceCount = await prisma.race.count({
      where: { year: season.year },
    });
    console.log(`  - ${season.year}: ${raceCount} races`);
  }

  // Check drivers
  const driverCount = await prisma.driver.count();
  console.log(`\n👤 Total drivers: ${driverCount}`);

  // Check a sample driver
  const sampleDriver = await prisma.driver.findFirst({
    where: {
      OR: [
        { driverId: 'verstappen' },
        { driverId: 'hamilton' },
        { familyName: 'Verstappen' },
      ],
    },
  });
  console.log(`\n Sample driver:`, sampleDriver);

  // Check constructors
  const constructorCount = await prisma.constructor.count();
  console.log(`\n🏎️  Total constructors: ${constructorCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
