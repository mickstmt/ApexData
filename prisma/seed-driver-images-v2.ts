/**
 * Seed Script: Driver Images (Updated - Using Placeholders)
 * 
 * Populates imageUrl field for F1 drivers using UI Avatars API
 * This provides reliable placeholder images with driver initials
 * 
 * Usage: npx tsx prisma/seed-driver-images-v2.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to generate UI Avatars URL
function generateAvatarUrl(name: string, background = '000000', color = 'CCFF00'): string {
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=400&background=${background}&color=${color}&bold=true&format=png`;
}

// Team colors for backgrounds
const TEAM_COLORS: Record<string, { bg: string; fg: string }> = {
    'red_bull': { bg: '0600EF', fg: 'FFFFFF' },
    'mercedes': { bg: '00D2BE', fg: '000000' },
    'ferrari': { bg: 'DC0000', fg: 'FFFFFF' },
    'mclaren': { bg: 'FF8700', fg: 'FFFFFF' },
    'alpine': { bg: '0090FF', fg: 'FFFFFF' },
    'aston_martin': { bg: '006F62', fg: 'FFFFFF' },
    'williams': { bg: '005AFF', fg: 'FFFFFF' },
    'rb': { bg: '2B4562', fg: 'FFFFFF' },
    'kick_sauber': { bg: '900000', fg: 'FFFFFF' },
    'haas': { bg: 'FFFFFF', fg: '000000' },
};

async function seedDriverImages() {
    console.log('🖼️  Seeding driver images with UI Avatars placeholders...\n');

    let updated = 0;
    let errors: string[] = [];

    // Get all drivers from database
    const drivers = await prisma.driver.findMany({
        include: {
            results: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                include: {
                    constructor: true,
                },
            },
        },
    });

    for (const driver of drivers) {
        try {
            const fullName = `${driver.givenName} ${driver.familyName}`;

            // Get team color if available
            let bg = '000000'; // Default black
            let fg = 'CCFF00'; // Default lime green

            if (driver.results.length > 0) {
                const constructorId = driver.results[0].constructor.constructorId;
                const teamColor = TEAM_COLORS[constructorId];
                if (teamColor) {
                    bg = teamColor.bg;
                    fg = teamColor.fg;
                }
            }

            const imageUrl = generateAvatarUrl(fullName, bg, fg);

            await prisma.driver.update({
                where: { id: driver.id },
                data: { imageUrl },
            });

            console.log(`  ✅ ${fullName} (${driver.driverId}) - ${imageUrl.substring(0, 60)}...`);
            updated++;
        } catch (error) {
            const errorMsg = `Error updating ${driver.driverId}: ${error}`;
            console.error(`  ❌ ${errorMsg}`);
            errors.push(errorMsg);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✨ Driver images seed completed!`);
    console.log(`✅ Updated: ${updated} drivers`);
    if (errors.length > 0) {
        console.log(`❌ Errors: ${errors.length}`);
        errors.forEach(err => console.log(`   - ${err}`));
    }
    console.log('='.repeat(60) + '\n');

    console.log('💡 Note: Using UI Avatars API for placeholder images');
    console.log('   These are temporary placeholders with driver initials');
    console.log('   Replace with real photos when available\n');
}

seedDriverImages()
    .catch((error) => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
