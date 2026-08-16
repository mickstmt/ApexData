/**
 * Seed Script: Driver Images
 * 
 * Populates imageUrl field for F1 drivers with Wikimedia Commons images
 * 
 * Usage: npx tsx prisma/seed-driver-images.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Driver images from Wikimedia Commons
// Using high-quality images from 2023-2024 seasons
const DRIVER_IMAGES: Record<string, string> = {
  // 2024-2025 Grid
  'max_verstappen': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Max_Verstappen_2024.jpg/800px-Max_Verstappen_2024.jpg',
  'perez': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Sergio_P%C3%A9rez_2023.jpg/800px-Sergio_P%C3%A9rez_2023.jpg',
  'hamilton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Lewis_Hamilton_2016_Malaysia_2.jpg/800px-Lewis_Hamilton_2016_Malaysia_2.jpg',
  'russell': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/George_Russell_2023.jpg/800px-George_Russell_2023.jpg',
  'leclerc': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Charles_Leclerc_2023.jpg/800px-Charles_Leclerc_2023.jpg',
  'sainz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Carlos_Sainz_Jr._2023.jpg/800px-Carlos_Sainz_Jr._2023.jpg',
  'norris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Lando_Norris_2023.jpg/800px-Lando_Norris_2023.jpg',
  'piastri': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Oscar_Piastri_2023.jpg/800px-Oscar_Piastri_2023.jpg',
  'alonso': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Fernando_Alonso_2023.jpg/800px-Fernando_Alonso_2023.jpg',
  'stroll': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Lance_Stroll_2023.jpg/800px-Lance_Stroll_2023.jpg',
  'ocon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Esteban_Ocon_2023.jpg/800px-Esteban_Ocon_2023.jpg',
  'gasly': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Pierre_Gasly_2023.jpg/800px-Pierre_Gasly_2023.jpg',
  'tsunoda': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Yuki_Tsunoda_2023.jpg/800px-Yuki_Tsunoda_2023.jpg',
  'ricciardo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Daniel_Ricciardo_2023.jpg/800px-Daniel_Ricciardo_2023.jpg',
  'hulkenberg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Nico_H%C3%BClkenberg_2023.jpg/800px-Nico_H%C3%BClkenberg_2023.jpg',
  'kevin_magnussen': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Kevin_Magnussen_2023.jpg/800px-Kevin_Magnussen_2023.jpg',
  'bottas': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Valtteri_Bottas_2023.jpg/800px-Valtteri_Bottas_2023.jpg',
  'zhou': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Zhou_Guanyu_2023.jpg/800px-Zhou_Guanyu_2023.jpg',
  'albon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Alexander_Albon_2023.jpg/800px-Alexander_Albon_2023.jpg',
  'sargeant': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Logan_Sargeant_2023.jpg/800px-Logan_Sargeant_2023.jpg',
  'colapinto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Franco_Colapinto_2024.jpg/800px-Franco_Colapinto_2024.jpg',
  
  // 2020-2023 Drivers (retired or moved)
  'vettel': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Sebastian_Vettel_2015_Malaysia_podium_1.jpg/800px-Sebastian_Vettel_2015_Malaysia_podium_1.jpg',
  'raikkonen': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Kimi_R%C3%A4ikk%C3%B6nen_2017.jpg/800px-Kimi_R%C3%A4ikk%C3%B6nen_2017.jpg',
  'latifi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Nicholas_Latifi_2022.jpg/800px-Nicholas_Latifi_2022.jpg',
  'mazepin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Nikita_Mazepin_2021.jpg/800px-Nikita_Mazepin_2021.jpg',
  'schumacher': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Mick_Schumacher_2022.jpg/800px-Mick_Schumacher_2022.jpg',
  'giovinazzi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Antonio_Giovinazzi_2021.jpg/800px-Antonio_Giovinazzi_2021.jpg',
  'de_vries': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Nyck_de_Vries_2023.jpg/800px-Nyck_de_Vries_2023.jpg',
  'lawson': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Liam_Lawson_2023.jpg/800px-Liam_Lawson_2023.jpg',
};

async function seedDriverImages() {
  console.log('🖼️  Seeding driver images from Wikimedia Commons...\n');

  let updated = 0;
  let notFound = 0;
  const errors: string[] = [];

  for (const [driverId, imageUrl] of Object.entries(DRIVER_IMAGES)) {
    try {
      const driver = await prisma.driver.findUnique({
        where: { driverId },
      });

      if (!driver) {
        console.log(`  ⏭️  Driver not found: ${driverId}`);
        notFound++;
        continue;
      }

      await prisma.driver.update({
        where: { driverId },
        data: { imageUrl },
      });

      console.log(`  ✅ Updated ${driver.givenName} ${driver.familyName} (${driverId})`);
      updated++;
    } catch (error) {
      const errorMsg = `Error updating ${driverId}: ${error}`;
      console.error(`  ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✨ Driver images seed completed!`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭️  Not found: ${notFound}`);
  if (errors.length > 0) {
    console.log(`❌ Errors: ${errors.length}`);
    errors.forEach(err => console.log(`   - ${err}`));
  }
  console.log('='.repeat(60) + '\n');
}

seedDriverImages()
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
