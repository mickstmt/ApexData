/**
 * One-off repair for rows seeded before the DNF fix.
 *
 * The old seeds tested `result.position` (always numeric) instead of
 * `positionText` (which carries 'R', 'D', 'W', 'E', 'F', 'N' for retirements
 * and disqualifications), so every DNF/DSQ was stored with a finishing
 * position. Anything that counts wins or podiums was inflated by those rows.
 *
 * Run with: npx tsx scripts/fix-dnf-positions.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Corrigiendo posiciones de abandonos y descalificaciones...\n');

  // positionText ~ '^[0-9]+$' means classified; anything else is a retirement.
  const results = await prisma.$executeRaw`
    UPDATE results
    SET position = NULL, "updatedAt" = NOW()
    WHERE position IS NOT NULL
      AND "positionText" !~ '^[0-9]+$'
  `;
  console.log(`   results:        ${results} filas corregidas`);

  const sprints = await prisma.$executeRaw`
    UPDATE sprint_results
    SET position = NULL, "updatedAt" = NOW()
    WHERE position IS NOT NULL
      AND "positionText" !~ '^[0-9]+$'
  `;
  console.log(`   sprint_results: ${sprints} filas corregidas`);

  // Sanity check: winners must now be exactly one per race.
  const suspicious = await prisma.$queryRaw<Array<{ year: number; round: number; winners: bigint }>>`
    SELECT ra.year, ra.round, COUNT(*) AS winners
    FROM results re
    JOIN races ra ON ra.id = re."raceId"
    WHERE re.position = 1
    GROUP BY ra.year, ra.round
    HAVING COUNT(*) <> 1
    ORDER BY ra.year, ra.round
  `;

  if (suspicious.length === 0) {
    console.log('\n✅ Verificación: todas las carreras tienen exactamente un ganador.');
  } else {
    console.log('\n⚠️  Carreras con un número de ganadores distinto de 1:');
    for (const race of suspicious) {
      console.log(`   ${race.year} ronda ${race.round}: ${race.winners}`);
    }
  }
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
