/**
 * Seed Script: Circuit Images
 * 
 * Populates imageUrl field for F1 circuits with Wikimedia Commons circuit layout images
 * 
 * Usage: npx tsx prisma/seed-circuit-images.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Circuit layout images from Wikimedia Commons
// Using official circuit maps and layouts
const CIRCUIT_IMAGES: Record<string, string> = {
    // Current F1 Circuits (2024)
    'bahrain': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Bahrain_International_Circuit--Grand_Prix_Layout.svg/800px-Bahrain_International_Circuit--Grand_Prix_Layout.svg.png',
    'jeddah': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Jeddah_Street_Circuit.svg/800px-Jeddah_Street_Circuit.svg.png',
    'albert_park': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Albert_Park_Circuit_map.svg/800px-Albert_Park_Circuit_map.svg.png',
    'suzuka': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Suzuka_circuit_map--2003_to_present.svg/800px-Suzuka_circuit_map--2003_to_present.svg.png',
    'shanghai': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Shanghai_International_Circuit_track_map.svg/800px-Shanghai_International_Circuit_track_map.svg.png',
    'miami': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Miami_International_Autodrome_track_map.svg/800px-Miami_International_Autodrome_track_map.svg.png',
    'imola': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Imola.svg/800px-Imola.svg.png',
    'monaco': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Monte_Carlo_Formula_1_track_map.svg/800px-Monte_Carlo_Formula_1_track_map.svg.png',
    'villeneuve': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Circuit_Gilles_Villeneuve.svg/800px-Circuit_Gilles_Villeneuve.svg.png',
    'catalunya': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Circuit_de_Barcelona.svg/800px-Circuit_de_Barcelona.svg.png',
    'red_bull_ring': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Circuit_Red_Bull_Ring.svg/800px-Circuit_Red_Bull_Ring.svg.png',
    'silverstone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Silverstone_Circuit_2020.svg/800px-Silverstone_Circuit_2020.svg.png',
    'hungaroring': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Hungaroring.svg/800px-Hungaroring.svg.png',
    'spa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Spa-Francorchamps_of_Belgium.svg/800px-Spa-Francorchamps_of_Belgium.svg.png',
    'zandvoort': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Zandvoort_Circuit.svg/800px-Zandvoort_Circuit.svg.png',
    'monza': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Monza_track_map.svg/800px-Monza_track_map.svg.png',
    'baku': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Baku_Formula_One_circuit_map.svg/800px-Baku_Formula_One_circuit_map.svg.png',
    'marina_bay': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Marina_Bay_Street_Circuit_2023.svg/800px-Marina_Bay_Street_Circuit_2023.svg.png',
    'americas': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Austin_circuit.svg/800px-Austin_circuit.svg.png',
    'rodriguez': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Aut%C3%B3dromo_Hermanos_Rodr%C3%ADguez_2015.svg/800px-Aut%C3%B3dromo_Hermanos_Rodr%C3%ADguez_2015.svg.png',
    'interlagos': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Aut%C3%B3dromo_Jos%C3%A9_Carlos_Pace_%28AKA_Interlagos%29_track_map.svg/800px-Aut%C3%B3dromo_Jos%C3%A9_Carlos_Pace_%28AKA_Interlagos%29_track_map.svg.png',
    'vegas': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Las_Vegas_Grand_Prix_Circuit_map.svg/800px-Las_Vegas_Grand_Prix_Circuit_map.svg.png',
    'losail': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Losail_International_Circuit.svg/800px-Losail_International_Circuit.svg.png',
    'yas_marina': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Yas_Marina_Circuit_2021.svg/800px-Yas_Marina_Circuit_2021.svg.png',

    // Historical Circuits
    'nurburgring': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/N%C3%BCrburgring_Grand-Prix-Strecke_2002.svg/800px-N%C3%BCrburgring_Grand-Prix-Strecke_2002.svg.png',
    'hockenheimring': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Hockenheimring_2002.svg/800px-Hockenheimring_2002.svg.png',
    'istanbul': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Istanbul_Park_circuit_map.svg/800px-Istanbul_Park_circuit_map.svg.png',
    'portimao': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Algarve_International_Circuit--Grand_Prix_Layout.svg/800px-Algarve_International_Circuit--Grand_Prix_Layout.svg.png',
    'mugello': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Mugello_Racing_Circuit_track_map.svg/800px-Mugello_Racing_Circuit_track_map.svg.png',
    'sochi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Sochi_Autodrom_track_map.svg/800px-Sochi_Autodrom_track_map.svg.png',
};

async function seedCircuitImages() {
    console.log('🏁 Seeding circuit images from Wikimedia Commons...\n');

    let updated = 0;
    let notFound = 0;
    const errors: string[] = [];

    for (const [circuitId, imageUrl] of Object.entries(CIRCUIT_IMAGES)) {
        try {
            const circuit = await prisma.circuit.findUnique({
                where: { circuitId },
            });

            if (!circuit) {
                console.log(`  ⏭️  Circuit not found: ${circuitId}`);
                notFound++;
                continue;
            }

            await prisma.circuit.update({
                where: { circuitId },
                data: { imageUrl },
            });

            console.log(`  ✅ Updated ${circuit.name} (${circuitId})`);
            updated++;
        } catch (error) {
            const errorMsg = `Error updating ${circuitId}: ${error}`;
            console.error(`  ❌ ${errorMsg}`);
            errors.push(errorMsg);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✨ Circuit images seed completed!`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Not found: ${notFound}`);
    if (errors.length > 0) {
        console.log(`❌ Errors: ${errors.length}`);
        errors.forEach(err => console.log(`   - ${err}`));
    }
    console.log('='.repeat(60) + '\n');
}

seedCircuitImages()
    .catch((error) => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
