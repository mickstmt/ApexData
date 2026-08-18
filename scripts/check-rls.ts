/**
 * Informe del estado de Row Level Security en el esquema público.
 *
 * Supabase expone una API REST sobre las tablas del esquema `public`, y en su
 * modelo de seguridad la clave anónima está pensada para ser pública: lo único
 * que impide leer o escribir a través de esa API es RLS. La app no usa esa vía
 * —se conecta por Prisma con usuario y contraseña de Postgres—, así que activar
 * RLS sin políticas cierra la puerta sin afectar a nada: el rol propietario de
 * las tablas la ignora por definición.
 *
 * Uso: npm run db:rls
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TableSecurity {
  tabla: string;
  rls: boolean;
  politicas: bigint;
}

async function main() {
  const rows = await prisma.$queryRaw<TableSecurity[]>`
    SELECT c.relname AS tabla,
           c.relrowsecurity AS rls,
           (SELECT count(*) FROM pg_policies pol
             WHERE pol.schemaname = 'public' AND pol.tablename = c.relname) AS politicas
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `;

  let expuestas = 0;

  for (const row of rows) {
    const estado = row.rls ? '🔒 RLS activo' : '🔓 EXPUESTA  ';
    if (!row.rls) expuestas++;
    console.log(`${estado}  ${row.tabla.padEnd(24)} políticas: ${Number(row.politicas)}`);
  }

  console.log(`\n${rows.length} tablas · ${expuestas} sin RLS`);

  if (expuestas > 0) {
    console.log(
      '\nLas tablas sin RLS son accesibles por la API REST de Supabase para\n' +
        'cualquiera que tenga la clave anónima del proyecto.'
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());