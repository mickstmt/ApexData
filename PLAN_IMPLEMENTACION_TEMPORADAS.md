# Plan de Implementación: Agregar Nuevas Temporadas

Este documento describe el proceso completo para agregar datos de una nueva temporada al sistema ApexData.

## 📋 Tabla de Contenidos

1. [Análisis de Datos Disponibles](#fase-1-análisis-de-datos-disponibles)
2. [Crear Script de Seed](#fase-2-crear-script-de-seed)
3. [Base de Datos](#fase-3-base-de-datos)
4. [Ejecutar el Seed](#fase-4-ejecutar-el-seed)
5. [Actualizar la UI](#fase-5-actualizar-la-ui)
6. [Testing](#fase-6-testing)
7. [Optimizaciones](#fase-7-optimizaciones)

---

## FASE 1: Análisis de Datos Disponibles 🔍

### Objetivo
Verificar qué datos están disponibles en la API para la temporada objetivo.

### Pasos

1. **Verificar disponibilidad de datos en API**
   ```bash
   # Consultar datos generales
   curl "https://api.jolpi.ca/ergast/f1/2023/results.json?limit=1"

   # Ver una ronda específica
   curl "https://api.jolpi.ca/ergast/f1/2023/1/results.json"
   ```

2. **Determinar número de carreras**
   - 2024: 24 carreras
   - 2023: 22 carreras
   - 2022: 22 carreras

3. **Identificar diferencias con otras temporadas**
   - Pilotos diferentes (rookies, retirados, cambios de equipo)
   - Constructores diferentes (cambios de nombre, nuevos equipos)
   - Circuitos diferentes (calendario modificado)

---

## FASE 2: Crear Script de Seed 📝

### Objetivo
Crear un script específico para la temporada objetivo.

### Archivo a crear
`prisma/seed-results-YYYY.ts` (donde YYYY es el año)

### Estructura del script

```typescript
/**
 * Seed Script: Race Results YYYY
 *
 * Este script obtiene todos los resultados de carreras de la temporada YYYY
 * desde la API de Jolpica F1 y los inserta en nuestra base de datos.
 *
 * Uso: npx tsx prisma/seed-results-YYYY.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JOLPICA_BASE_URL = 'https://api.jolpi.ca/ergast/f1';

// INTERFACES (reutilizar de seed-results-2024.ts)
interface JolpicaDriver {
  driverId: string;
  givenName: string;
  familyName: string;
  code?: string;
  permanentNumber?: string;
  nationality: string;
  dateOfBirth: string;
  url: string;
}

interface JolpicaConstructor {
  constructorId: string;
  name: string;
  nationality: string;
  url: string;
}

interface JolpicaRace {
  season: string;
  round: string;
  raceName: string;
  url: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    url: string;
    Location: {
      lat: string;
      long: string;
      locality: string;
      country: string;
    };
  };
  date: string;
  time?: string;
  Results: JolpicaResult[];
}

// ... (copiar todas las interfaces)

// FUNCIONES AUXILIARES (reutilizar de seed-results-2024.ts)
async function ensureDriverExists(jolpicaDriver: JolpicaDriver) { ... }
async function ensureConstructorExists(jolpicaConstructor: JolpicaConstructor) { ... }
async function ensureCircuitExists(jolpicaCircuit: JolpicaRace['Circuit']) { ... }
async function ensureRaceExists(jolpicaRace: JolpicaRace) { ... }

// FUNCIÓN DE FETCH - AJUSTAR NÚMERO DE RONDAS
async function fetchRacesWithResults(year: number, maxRounds: number) {
  console.log(`\n🔍 Obteniendo resultados de la temporada ${year}...`);

  const allRaces: JolpicaRace[] = [];

  for (let round = 1; round <= maxRounds; round++) {
    const url = `${JOLPICA_BASE_URL}/${year}/${round}/results.json`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`  ⏭️  Ronda ${round}: Sin resultados disponibles aún`);
          continue;
        }
        throw new Error(`Error HTTP en ronda ${round}: ${response.status}`);
      }

      const data = await response.json();
      const races = data.MRData.RaceTable.Races as JolpicaRace[];

      if (races.length > 0) {
        allRaces.push(...races);
        console.log(`  ✅ Ronda ${round}: ${races[0].raceName}`);
      }
    } catch (error) {
      console.log(`  ⚠️  Error al obtener ronda ${round}:`, error);
      continue;
    }
  }

  console.log(`\n📊 Total de carreras con resultados: ${allRaces.length}`);
  return allRaces;
}

// FUNCIÓN PRINCIPAL - CAMBIAR AÑO Y NOMBRE
async function seedResultsYYYY() {
  console.log('🚀 Iniciando seed de resultados YYYY...\n');

  try {
    // IMPORTANTE: Ajustar maxRounds según la temporada
    const races = await fetchRacesWithResults(YYYY, MAX_ROUNDS);
    console.log(`✅ Se encontraron ${races.length} carreras con resultados\n`);

    let totalResults = 0;
    let newResults = 0;

    for (const race of races) {
      console.log(`\n📍 Procesando: ${race.raceName} (Round ${race.round})`);

      const dbRace = await ensureRaceExists(race);

      for (const result of race.Results) {
        totalResults++;

        const driver = await ensureDriverExists(result.Driver);
        const constructor = await ensureConstructorExists(result.Constructor);

        // Verificar si el resultado ya existe
        const existingResult = await prisma.result.findFirst({
          where: {
            raceId: dbRace.id,
            driverId: driver.id,
          },
        });

        if (existingResult) {
          console.log(`  ⏭️  Resultado ya existe: ${driver.familyName} - P${result.positionText}`);
          continue;
        }

        // Crear el resultado
        const position = result.position === 'R' || result.position === 'D'
          ? null
          : parseInt(result.position);

        await prisma.result.create({
          data: {
            raceId: dbRace.id,
            driverId: driver.id,
            constructorId: constructor.id,
            position,
            positionText: result.positionText,
            positionOrder: parseInt(result.position) || 99,
            points: parseFloat(result.points),
            grid: parseInt(result.grid),
            laps: parseInt(result.laps),
            status: result.status,
            statusId: result.status === 'Finished' ? 1 : 2,
            time: result.Time?.time || null,
            milliseconds: result.Time?.millis ? BigInt(result.Time.millis) : null,
            fastestLap: result.FastestLap ? parseInt(result.FastestLap.lap) : null,
            rank: result.FastestLap ? parseInt(result.FastestLap.rank) : null,
            fastestLapTime: result.FastestLap?.Time.time || null,
            fastestLapSpeed: result.FastestLap?.AverageSpeed?.speed || null,
          },
        });

        newResults++;
        console.log(`  ✅ Insertado: ${driver.familyName} - P${result.positionText} (${result.points} pts)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✨ Seed completado exitosamente!`);
    console.log(`📊 Total de resultados procesados: ${totalResults}`);
    console.log(`➕ Nuevos resultados insertados: ${newResults}`);
    console.log(`⏭️  Resultados ya existentes: ${totalResults - newResults}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// EJECUTAR
seedResultsYYYY()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
```

### Cambios clave a realizar

| Elemento | Qué cambiar | Ejemplo |
|----------|-------------|---------|
| Nombre de archivo | `seed-results-YYYY.ts` | `seed-results-2023.ts` |
| Función principal | `seedResultsYYYY()` | `seedResults2023()` |
| Año en fetch | Parámetro `year` | `fetchRacesWithResults(2023, 22)` |
| Número de rondas | Parámetro `maxRounds` | `22` para 2023 |
| Mensaje de console.log | Año en mensajes | `"Iniciando seed de resultados 2023..."` |

---

## FASE 3: Base de Datos 💾

### Verificaciones

✅ **El schema actual ya soporta múltiples temporadas**

```prisma
model Race {
  id      String   @id @default(cuid())
  year    Int      // Permite cualquier año
  round   Int
  // ...
  @@unique([year, round]) // Clave única por año y ronda
}
```

✅ **No se necesita migración nueva**
- La estructura actual soporta cualquier temporada
- Solo necesitas insertar datos con el año correspondiente

✅ **Relaciones existentes funcionan para múltiples temporadas**
- Pilotos: Pueden existir en múltiples temporadas
- Constructores: Pueden existir en múltiples temporadas
- Circuitos: Son compartidos entre temporadas

---

## FASE 4: Ejecutar el Seed ⚡

### Comandos en orden

```bash
# 1. Ejecutar el script de seed
npx tsx prisma/seed-results-YYYY.ts

# 2. Verificar que se insertaron los datos correctamente
npx tsx verify-results.ts
```

### Script de verificación opcional

Crear `verify-results-YYYY.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyResultsYYYY() {
  console.log('\n🔍 Verificando datos de la temporada YYYY...\n');

  const races = await prisma.race.findMany({
    where: { year: YYYY },
    include: {
      circuit: true,
      _count: {
        select: { results: true }
      }
    },
    orderBy: { round: 'asc' }
  });

  console.log(`✅ Total de carreras YYYY: ${races.length}\n`);

  races.forEach((race) => {
    console.log(
      `Round ${race.round.toString().padStart(2, ' ')}: ${race.raceName.padEnd(35, ' ')} - ${race._count.results} resultados`
    );
  });

  const totalResults = races.reduce((sum, race) => sum + race._count.results, 0);
  console.log(`\nTotal de resultados YYYY: ${totalResults}\n`);

  await prisma.$disconnect();
}

verifyResultsYYYY();
```

### Actualizar circuitos incompletos (si es necesario)

```bash
# Si algunos circuitos tienen datos incompletos
npx tsx update-incomplete-circuits.ts

# Verificar integridad completa de datos
npx tsx verify-complete-data.ts
```

---

## FASE 5: Actualizar la UI 🎨

### Verificaciones

✅ **El `SeasonSelector` ya está preparado**
- Permite seleccionar diferentes años dinámicamente
- No necesita cambios obligatorios

✅ **La página `/results` funciona con cualquier año**
```typescript
// Ya implementado en src/app/results/page.tsx
const displayYear = params.season ? parseInt(params.season) : 2024;

const races = await prisma.race.findMany({
  where: { year: displayYear }, // Filtra dinámicamente
  // ...
});
```

✅ **La página de detalle también funciona**
```typescript
// Ya implementado en src/app/results/[year]/[round]/page.tsx
const race = await prisma.race.findUnique({
  where: {
    year_round: {
      year: yearNum,  // Usa el año de la URL
      round: roundNum,
    },
  },
  // ...
});
```

### Opcional: Actualizar lista de años disponibles

**Opción 1 - Array estático** (más simple):
```typescript
// src/components/ui/SeasonSelector.tsx
const AVAILABLE_SEASONS = [2024, 2023, 2022, 2021];
```

**Opción 2 - Dinámico desde la BD** (recomendado):
```typescript
// Obtener años con datos
const availableYears = await prisma.race.findMany({
  select: { year: true },
  distinct: ['year'],
  orderBy: { year: 'desc' }
});

const AVAILABLE_SEASONS = availableYears.map(r => r.year);
```

---

## FASE 6: Testing 🧪

### Checklist de pruebas

#### 1. Seed Script
- [ ] El script se ejecuta sin errores
- [ ] Se procesan todas las carreras de la temporada
- [ ] Se crean todos los pilotos nuevos
- [ ] Se crean todos los constructores
- [ ] Se actualizan circuitos con datos completos
- [ ] Se insertan todos los resultados (~440 para 22 carreras)

#### 2. Base de Datos
```sql
-- Verificar carreras insertadas
SELECT * FROM "races" WHERE year = YYYY;

-- Contar resultados
SELECT COUNT(*)
FROM "results"
WHERE "raceId" IN (SELECT id FROM "races" WHERE year = YYYY);

-- Verificar pilotos únicos
SELECT DISTINCT d.*
FROM "drivers" d
JOIN "results" r ON r."driverId" = d.id
JOIN "races" ra ON ra.id = r."raceId"
WHERE ra.year = YYYY;
```

#### 3. UI
- [ ] Abrir `http://localhost:3000/results?season=YYYY`
- [ ] Verificar que se muestran todas las carreras
- [ ] Hacer clic en una carrera y verificar el detalle
- [ ] Verificar que los tabs funcionan correctamente
- [ ] Verificar que el selector de temporada funciona
- [ ] Probar navegación entre temporadas

#### 4. Performance
- [ ] Las queries son rápidas (< 500ms)
- [ ] No hay memory leaks en el script
- [ ] El selector de temporada responde rápido
- [ ] Las tablas de resultados cargan sin demora

---

## FASE 7: Optimizaciones ⚡

### Mejoras opcionales

#### 1. Script de seed genérico
```typescript
// prisma/seed-results-generic.ts
async function seedResultsForYear(year: number, maxRounds: number) {
  // Lógica genérica que funciona para cualquier año
}

// Uso desde línea de comandos
const year = parseInt(process.argv[2]);
const rounds = parseInt(process.argv[3]);
seedResultsForYear(year, rounds);
```

Ejecutar:
```bash
npx tsx prisma/seed-results-generic.ts 2023 22
```

#### 2. Índices adicionales
```prisma
model Race {
  // ...
  @@index([year])           // Ya existe
  @@index([year, round])    // Opcional para queries combinadas
}

model Result {
  // ...
  @@index([raceId])         // Ya existe
  @@index([driverId])       // Ya existe
}
```

#### 3. Cache de datos
```typescript
// Usar en componentes client-side
import { useQuery } from '@tanstack/react-query';

const { data: races } = useQuery(
  ['races', year],
  () => fetchRaces(year),
  {
    staleTime: 1000 * 60 * 60, // 1 hora
    cacheTime: 1000 * 60 * 60 * 24, // 24 horas
  }
);
```

#### 4. Pre-rendering de páginas populares
```typescript
// src/app/results/[year]/[round]/page.tsx
export async function generateStaticParams() {
  // Generar paths estáticos para temporadas completas
  const years = [2024, 2023, 2022];
  const paths = [];

  for (const year of years) {
    const races = await prisma.race.findMany({
      where: { year },
      select: { year: true, round: true },
    });

    paths.push(...races.map(r => ({
      year: r.year.toString(),
      round: r.round.toString(),
    })));
  }

  return paths;
}
```

---

## 📊 Resumen de Archivos

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `prisma/seed-results-YYYY.ts` | **CREAR** | Script de seed para la temporada |
| `verify-results-YYYY.ts` | **CREAR** (opcional) | Script de verificación |
| `src/components/ui/SeasonSelector.tsx` | **MODIFICAR** (opcional) | Agregar año al array |
| `prisma/schema.prisma` | ✅ **NO MODIFICAR** | Ya soporta múltiples temporadas |
| `/results/page.tsx` | ✅ **NO MODIFICAR** | Ya funciona con cualquier año |
| `/results/[year]/[round]/page.tsx` | ✅ **NO MODIFICAR** | Ya funciona con cualquier año |
| `/results/[year]/[round]/RaceDetailClient.tsx` | ✅ **NO MODIFICAR** | Ya funciona con cualquier año |

---

## 🎯 Comandos Rápidos (Ejemplo para 2023)

```bash
# 1. Crear archivo copiando el de 2024
cp prisma/seed-results-2024.ts prisma/seed-results-2023.ts

# 2. Editar el archivo (cambiar año y número de rondas)
# - Cambiar 24 por 22 en el loop
# - Cambiar seedResults2024() por seedResults2023()
# - Cambiar año en fetchRacesWithResults

# 3. Ejecutar el seed
npx tsx prisma/seed-results-2023.ts

# 4. Verificar los datos
npx tsx verify-results.ts

# 5. Actualizar circuitos incompletos (si los hay)
npx tsx update-incomplete-circuits.ts

# 6. Verificación final
npx tsx verify-complete-data.ts

# 7. Probar en el navegador
npm run dev
# Abrir: http://localhost:3000/results?season=2023
```

---

## 💡 Conceptos Clave

1. **Schema Flexible**: Un modelo con `year: Int` puede almacenar cualquier año
2. **Scripts Reutilizables**: Solo cambiar año y número de rondas
3. **Relaciones Persistentes**: Pilotos y constructores pueden estar en múltiples temporadas
4. **UI Dinámica**: El parámetro `season` en la URL controla todo
5. **Incremental**: Agregar nuevas temporadas no afecta las existentes

---

## 📚 Referencias

- API de Jolpica F1: https://api.jolpi.ca/ergast/f1/
- Documentación de Prisma: https://www.prisma.io/docs
- Next.js App Router: https://nextjs.org/docs/app

---

## 📝 Notas Adicionales

- **Pilotos y Constructores**: Se crean automáticamente si no existen
- **Circuitos**: Se actualizan si tienen datos incompletos
- **URLs**: Se guardan automáticamente desde la API
- **Coordenadas**: Se extraen y guardan para cada circuito
- **Tiempos de carrera**: Se incluyen horarios UTC

---

**Última actualización**: 2025-01-24
**Versión**: 1.0.0
