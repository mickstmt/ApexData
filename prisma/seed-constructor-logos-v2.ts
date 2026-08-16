/**
 * Seed Script: Constructor Logos (Updated - Direct Wikipedia URLs)
 * 
 * Populates logoUrl field for F1 constructors using direct Wikipedia SVG links
 * 
 * Usage: npx tsx prisma/seed-constructor-logos-v2.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Constructor logos - Direct Wikipedia/Wikimedia URLs (more reliable)
const CONSTRUCTOR_LOGOS: Record<string, string> = {
    // 2024-2025 Teams - Using direct Wikipedia file URLs
    'red_bull': 'https://en.wikipedia.org/wiki/File:Red_Bull_Racing_logo.svg',
    'mercedes': 'https://en.wikipedia.org/wiki/File:Mercedes_AMG_Petronas_F1_Logo.svg',
    'ferrari': 'https://en.wikipedia.org/wiki/File:Scuderia_Ferrari_HP_logo.svg',
    'mclaren': 'https://en.wikipedia.org/wiki/File:McLaren_Racing_logo.svg',
    'alpine': 'https://en.wikipedia.org/wiki/File:Alpine_F1_Team_2021_Logo.svg',
    'aston_martin': 'https://en.wikipedia.org/wiki/File:Aston_Martin_Aramco_Cognizant_F1.svg',
    'williams': 'https://en.wikipedia.org/wiki/File:Williams_Racing_logo.svg',
    'rb': 'https://en.wikipedia.org/wiki/File:RB_Formula_One_Team_logo.svg',
    'kick_sauber': 'https://en.wikipedia.org/wiki/File:Stake_F1_Team_Kick_Sauber_logo.svg',
    'haas': 'https://en.wikipedia.org/wiki/File:Haas_F1_Team_logo.svg',

    // Historical teams
    'alphatauri': 'https://en.wikipedia.org/wiki/File:Scuderia_AlphaTauri_logo.svg',
    'alfa': 'https://en.wikipedia.org/wiki/File:Alfa_Romeo_F1_Team_Orlen_logo.svg',
    'racing_point': 'https://en.wikipedia.org/wiki/File:Racing_Point_F1_Team_logo.svg',
    'renault': 'https://en.wikipedia.org/wiki/File:Renault_F1_Team_logo.svg',
};

// Alternative: Using placeholder service with team colors
function generateTeamPlaceholder(name: string, color: string): string {
    const initials = name
        .split('_')
        .map(word => word[0])
        .join('')
        .toUpperCase();

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=${color}&color=FFFFFF&bold=true&format=png`;
}

const TEAM_COLORS: Record<string, string> = {
    'red_bull': '0600EF',
    'mercedes': '00D2BE',
    'ferrari': 'DC0000',
    'mclaren': 'FF8700',
    'alpine': '0090FF',
    'aston_martin': '006F62',
    'williams': '005AFF',
    'rb': '2B4562',
    'kick_sauber': '900000',
    'haas': 'B6BABD',
};

async function seedConstructorLogos(usePlaceholders = false) {
    console.log('🏁 Seeding constructor logos...\n');

    if (usePlaceholders) {
        console.log('📍 Using placeholder service with team colors\n');
    } else {
        console.log('📍 Using Wikipedia file links\n');
    }

    let updated = 0;
    let notFound = 0;
    const errors: string[] = [];

    const constructors = await prisma.constructor.findMany();

    for (const constructor of constructors) {
        try {
            let logoUrl: string;

            if (usePlaceholders) {
                const color = TEAM_COLORS[constructor.constructorId] || '000000';
                logoUrl = generateTeamPlaceholder(constructor.name, color);
            } else {
                logoUrl = CONSTRUCTOR_LOGOS[constructor.constructorId] || '';

                if (!logoUrl) {
                    console.log(`  ⏭️  No logo URL for: ${constructor.name}`);
                    notFound++;
                    continue;
                }
            }

            await prisma.constructor.update({
                where: { id: constructor.id },
                data: { logoUrl },
            });

            console.log(`  ✅ ${constructor.name} (${constructor.constructorId})`);
            updated++;
        } catch (error) {
            const errorMsg = `Error updating ${constructor.constructorId}: ${error}`;
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

    if (usePlaceholders) {
        console.log('💡 Using placeholder images with team colors');
    } else {
        console.log('💡 Note: Wikipedia file links may require manual download');
        console.log('   Consider using --placeholders flag for immediate results\n');
    }
}

// Check for --placeholders flag
const usePlaceholders = process.argv.includes('--placeholders');

seedConstructorLogos(usePlaceholders)
    .catch((error) => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
