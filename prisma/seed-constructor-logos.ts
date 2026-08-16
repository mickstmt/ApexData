/**
 * Seed Script: Constructor Logos
 * 
 * Populates logoUrl field for F1 constructors with local logo files
 * 
 * Usage: npx tsx prisma/seed-constructor-logos.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Constructor logos - using local files for better performance
// Place logo files in /public/logos/ directory
const CONSTRUCTOR_LOGOS: Record<string, string> = {
    // 2024-2025 Teams
    'red_bull': '/logos/red-bull.svg',
    'mercedes': '/logos/mercedes.svg',
    'ferrari': '/logos/ferrari.svg',
    'mclaren': '/logos/mclaren.svg',
    'alpine': '/logos/alpine.svg',
    'aston_martin': '/logos/aston-martin.svg',
    'williams': '/logos/williams.svg',
    'rb': '/logos/rb.svg', // RB F1 Team (formerly AlphaTauri)
    'kick_sauber': '/logos/sauber.svg',
    'haas': '/logos/haas.svg',

    // Historical teams (2020-2023)
    'alphatauri': '/logos/alphatauri.svg',
    'alfa': '/logos/alfa-romeo.svg',
    'racing_point': '/logos/racing-point.svg',
    'renault': '/logos/renault.svg',
};

// Alternative: Wikimedia Commons URLs (if you prefer external hosting)
const CONSTRUCTOR_LOGOS_WIKIMEDIA: Record<string, string> = {
    'red_bull': 'https://upload.wikimedia.org/wikipedia/en/thumb/7/72/Red_Bull_Racing_logo.svg/200px-Red_Bull_Racing_logo.svg.png',
    'mercedes': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Mercedes_AMG_Petronas_F1_Logo.svg/200px-Mercedes_AMG_Petronas_F1_Logo.svg.png',
    'ferrari': 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d9/Scuderia_Ferrari_HP_logo.svg/200px-Scuderia_Ferrari_HP_logo.svg.png',
    'mclaren': 'https://upload.wikimedia.org/wikipedia/en/thumb/6/66/McLaren_Racing_logo.svg/200px-McLaren_Racing_logo.svg.png',
    'alpine': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Alpine_F1_Team_2021_Logo.svg/200px-Alpine_F1_Team_2021_Logo.svg.png',
    'aston_martin': 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8b/Aston_Martin_Aramco_Cognizant_F1.svg/200px-Aston_Martin_Aramco_Cognizant_F1.svg.png',
    'williams': 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f9/Williams_Racing_logo.svg/200px-Williams_Racing_logo.svg.png',
    'rb': 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/RB_Formula_One_Team_logo.svg/200px-RB_Formula_One_Team_logo.svg.png',
    'kick_sauber': 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0f/Stake_F1_Team_Kick_Sauber_logo.svg/200px-Stake_F1_Team_Kick_Sauber_logo.svg.png',
    'haas': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Haas_F1_Team_logo.svg/200px-Haas_F1_Team_logo.svg.png',
};

async function seedConstructorLogos(useWikimedia = false) {
    console.log('🏁 Seeding constructor logos...\n');

    const logos = useWikimedia ? CONSTRUCTOR_LOGOS_WIKIMEDIA : CONSTRUCTOR_LOGOS;
    const source = useWikimedia ? 'Wikimedia Commons' : 'local files';
    console.log(`📍 Using ${source}\n`);

    let updated = 0;
    let notFound = 0;
    const errors: string[] = [];

    for (const [constructorId, logoUrl] of Object.entries(logos)) {
        try {
            const constructor = await prisma.constructor.findUnique({
                where: { constructorId },
            });

            if (!constructor) {
                console.log(`  ⏭️  Constructor not found: ${constructorId}`);
                notFound++;
                continue;
            }

            await prisma.constructor.update({
                where: { constructorId },
                data: { logoUrl },
            });

            console.log(`  ✅ Updated ${constructor.name} (${constructorId})`);
            updated++;
        } catch (error) {
            const errorMsg = `Error updating ${constructorId}: ${error}`;
            console.error(`  ❌ ${errorMsg}`);
            errors.push(errorMsg);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✨ Constructor logos seed completed!`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Not found: ${notFound}`);
    if (errors.length > 0) {
        console.log(`❌ Errors: ${errors.length}`);
        errors.forEach(err => console.log(`   - ${err}`));
    }
    console.log('='.repeat(60) + '\n');

    if (!useWikimedia) {
        console.log('💡 Note: Make sure to place logo files in /public/logos/ directory');
        console.log('   Or run with --wikimedia flag to use external URLs\n');
    }
}

// Check for --wikimedia flag
const useWikimedia = process.argv.includes('--wikimedia');

seedConstructorLogos(useWikimedia)
    .catch((error) => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
