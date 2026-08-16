/**
 * Seed Script: Local Images
 * 
 * Populates imageUrl/logoUrl fields using local files from /public/ directory
 * 
 * Prerequisites:
 * - Images must be in public/drivers/, public/logos/, public/circuits/
 * - Filenames must match driverId, constructorId, circuitId
 * 
 * Usage: npx tsx prisma/seed-local-images.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];

// Base paths
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const DRIVERS_DIR = path.join(PUBLIC_DIR, 'drivers');
const LOGOS_DIR = path.join(PUBLIC_DIR, 'logos');
const CIRCUITS_DIR = path.join(PUBLIC_DIR, 'circuits');

/**
 * Check if a file exists with any of the supported extensions
 */
function findImageFile(directory: string, baseName: string): string | null {
    for (const ext of IMAGE_EXTENSIONS) {
        const filePath = path.join(directory, `${baseName}${ext}`);
        if (fs.existsSync(filePath)) {
            // Return web path (relative to /public/)
            const relativePath = path.relative(PUBLIC_DIR, filePath);
            return '/' + relativePath.replace(/\\/g, '/');
        }
    }
    return null;
}

/**
 * Seed driver images
 */
async function seedDriverImages() {
    console.log('\n📸 Seeding driver images from local files...\n');

    const drivers = await prisma.driver.findMany();
    let updated = 0;
    let notFound = 0;

    for (const driver of drivers) {
        const imageUrl = findImageFile(DRIVERS_DIR, driver.driverId);

        if (imageUrl) {
            await prisma.driver.update({
                where: { id: driver.id },
                data: { imageUrl },
            });
            console.log(`  ✅ ${driver.givenName} ${driver.familyName} → ${imageUrl}`);
            updated++;
        } else {
            console.log(`  ⏭️  ${driver.givenName} ${driver.familyName} (${driver.driverId}) - No image found`);
            notFound++;
        }
    }

    console.log(`\n  📊 Drivers: ${updated} updated, ${notFound} not found`);
    return { updated, notFound };
}

/**
 * Seed constructor logos
 */
async function seedConstructorLogos() {
    console.log('\n🏁 Seeding constructor logos from local files...\n');

    const constructors = await prisma.constructor.findMany();
    let updated = 0;
    let notFound = 0;

    for (const constructor of constructors) {
        // Try with hyphenated version (e.g., red-bull instead of red_bull)
        const hyphenatedId = constructor.constructorId.replace(/_/g, '-');
        let logoUrl = findImageFile(LOGOS_DIR, hyphenatedId);

        // Fallback to original constructorId
        if (!logoUrl) {
            logoUrl = findImageFile(LOGOS_DIR, constructor.constructorId);
        }

        if (logoUrl) {
            await prisma.constructor.update({
                where: { id: constructor.id },
                data: { logoUrl },
            });
            console.log(`  ✅ ${constructor.name} → ${logoUrl}`);
            updated++;
        } else {
            console.log(`  ⏭️  ${constructor.name} (${constructor.constructorId}) - No logo found`);
            notFound++;
        }
    }

    console.log(`\n  📊 Constructors: ${updated} updated, ${notFound} not found`);
    return { updated, notFound };
}

/**
 * Seed circuit images
 */
async function seedCircuitImages() {
    console.log('\n🏎️  Seeding circuit images from local files...\n');

    const circuits = await prisma.circuit.findMany();
    let updated = 0;
    let notFound = 0;

    for (const circuit of circuits) {
        const imageUrl = findImageFile(CIRCUITS_DIR, circuit.circuitId);

        if (imageUrl) {
            await prisma.circuit.update({
                where: { id: circuit.id },
                data: { imageUrl },
            });
            console.log(`  ✅ ${circuit.name} → ${imageUrl}`);
            updated++;
        } else {
            console.log(`  ⏭️  ${circuit.name} (${circuit.circuitId}) - No image found`);
            notFound++;
        }
    }

    console.log(`\n  📊 Circuits: ${updated} updated, ${notFound} not found`);
    return { updated, notFound };
}

/**
 * Main seeding function
 */
async function seedLocalImages() {
    console.log('🖼️  Starting local images seed...');
    console.log('='.repeat(60));

    // Verify directories exist
    const dirs = [
        { path: DRIVERS_DIR, name: 'Drivers' },
        { path: LOGOS_DIR, name: 'Logos' },
        { path: CIRCUITS_DIR, name: 'Circuits' },
    ];

    console.log('\n📁 Checking directories...\n');
    for (const dir of dirs) {
        if (fs.existsSync(dir.path)) {
            const files = fs.readdirSync(dir.path);
            console.log(`  ✅ ${dir.name}: ${files.length} files found`);
        } else {
            console.log(`  ❌ ${dir.name}: Directory not found!`);
            console.log(`     Expected: ${dir.path}`);
        }
    }

    try {
        // Seed all categories
        const driversResult = await seedDriverImages();
        const constructorsResult = await seedConstructorLogos();
        const circuitsResult = await seedCircuitImages();

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('✨ Local images seed completed!\n');
        console.log('📊 Summary:');
        console.log(`   Drivers:      ${driversResult.updated} updated, ${driversResult.notFound} missing`);
        console.log(`   Constructors: ${constructorsResult.updated} updated, ${constructorsResult.notFound} missing`);
        console.log(`   Circuits:     ${circuitsResult.updated} updated, ${circuitsResult.notFound} missing`);
        console.log('='.repeat(60));

        const totalUpdated = driversResult.updated + constructorsResult.updated + circuitsResult.updated;
        const totalMissing = driversResult.notFound + constructorsResult.notFound + circuitsResult.notFound;

        console.log(`\n✅ Total updated: ${totalUpdated}`);
        console.log(`⏭️  Total missing: ${totalMissing}\n`);

        if (totalMissing > 0) {
            console.log('💡 Tip: Check NOMBRES_ARCHIVOS_IMAGENES.md for exact filenames needed');
            console.log('   Missing files will use fallback placeholders in the UI\n');
        }

    } catch (error) {
        console.error('\n❌ Error during seed:', error);
        throw error;
    }
}

// Execute
seedLocalImages()
    .catch((error) => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
