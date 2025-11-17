# ApexData - Database Schema Documentation

## Overview

Este documento describe la arquitectura de la base de datos de ApexData, diseñada para almacenar datos históricos y actuales de Fórmula 1.

## Filosofía de Diseño

### Principios
1. **Normalización**: Datos normalizados para evitar redundancia
2. **Performance**: Índices estratégicos en campos de consulta frecuente
3. **Integridad**: Relaciones con constraints apropiados
4. **Escalabilidad**: Diseño preparado para millones de registros históricos
5. **Type-Safety**: Aprovechamiento de Prisma para tipos TypeScript automáticos

### Estrategia de Caché
- **Datos inmutables**: Temporadas pasadas se cachean permanentemente
- **Datos mutables**: Temporada actual se actualiza semanalmente
- **Datos en tiempo real**: No se cachean, se obtienen on-demand de OpenF1

---

## Entidades Core

### Driver (Pilotos)
Almacena información de pilotos de F1 desde 1950.

**Campos clave:**
- `driverId`: ID único de Jolpica/Ergast (e.g., "hamilton")
- `permanentNumber`: Número permanente del piloto (e.g., 44 para Hamilton)
- `code`: Código de tres letras (e.g., "HAM")

**Índices:**
- `driverId`: Búsqueda por ID de API
- `nationality`: Filtrado por nacionalidad
- `permanentNumber`: Búsqueda rápida por número

**Relaciones:**
- `results`: Resultados de carreras (1:N)
- `qualifyings`: Resultados de clasificación (1:N)
- `sprintResults`: Resultados de sprints (1:N)

**Casos de uso:**
```typescript
// Obtener piloto por driverId
const driver = await prisma.driver.findUnique({
  where: { driverId: 'hamilton' },
  include: {
    results: {
      where: { position: 1 }, // Solo victorias
      include: { race: { include: { circuit: true } } }
    }
  }
});

// Filtrar pilotos por nacionalidad
const britishDrivers = await prisma.driver.findMany({
  where: { nationality: 'British' }
});
```

---

### Constructor (Equipos)
Almacena información de constructores/equipos.

**Campos clave:**
- `constructorId`: ID único de Jolpica/Ergast (e.g., "mercedes")
- `name`: Nombre del equipo
- `nationality`: Nacionalidad del equipo

**Índices:**
- `constructorId`: Búsqueda por ID de API
- `nationality`: Filtrado por nacionalidad

**Relaciones:**
- `results`: Resultados de carreras (1:N)
- `standings`: Clasificaciones de campeonato (1:N)

---

### Circuit (Circuitos)
Almacena información de circuitos históricos y actuales.

**Campos clave:**
- `circuitId`: ID único de Jolpica/Ergast (e.g., "monaco")
- `lat/lng`: Coordenadas geográficas
- `length`: Longitud en km
- `corners`: Número de curvas
- `lapRecord`: Récord de vuelta

**Índices:**
- `circuitId`: Búsqueda por ID
- `country`: Filtrado por país

**Casos de uso:**
```typescript
// Obtener circuitos europeos
const europeanCircuits = await prisma.circuit.findMany({
  where: {
    country: { in: ['Monaco', 'Italy', 'Spain', 'Belgium'] }
  }
});
```

---

### Season (Temporadas)
Almacena información de temporadas desde 1950.

**Campos clave:**
- `year`: Año de la temporada (único)
- `url`: URL de Wikipedia

**Relaciones:**
- `races`: Carreras de la temporada (1:N)

**Casos de uso:**
```typescript
// Obtener temporada completa
const season2024 = await prisma.season.findUnique({
  where: { year: 2024 },
  include: {
    races: {
      include: {
        circuit: true,
        results: { include: { driver: true, constructor: true } }
      }
    }
  }
});
```

---

### Race (Carreras)
Almacena información de Grandes Premios.

**Campos clave:**
- `year + round`: Identificador único compuesto
- `date`: Fecha de la carrera
- `fp1Date/qualiDate/sprintDate`: Fechas de sesiones
- `circuitId`: Relación con circuito

**Índices:**
- `year`: Filtrado por temporada
- `circuitId`: Carreras por circuito
- `date`: Ordenamiento cronológico

**Constraint único:**
- `[year, round]`: No puede haber dos carreras con mismo año y ronda

**Casos de uso:**
```typescript
// Obtener próxima carrera
const nextRace = await prisma.race.findFirst({
  where: {
    date: { gte: new Date() }
  },
  orderBy: { date: 'asc' },
  include: { circuit: true }
});

// Historial de Monaco
const monacoHistory = await prisma.race.findMany({
  where: { circuitId: 'monaco' },
  orderBy: { year: 'desc' },
  include: {
    results: {
      where: { position: 1 },
      include: { driver: true }
    }
  }
});
```

---

## Resultados

### Result (Resultados de Carrera)
Almacena resultados de carreras.

**Campos clave:**
- `position`: Posición final (null si DNF)
- `positionText`: Texto de posición ("1", "R", "D")
- `positionOrder`: Orden para sorting
- `points`: Puntos obtenidos
- `grid`: Posición de salida
- `fastestLap/fastestLapTime`: Vuelta rápida

**Índices:**
- `raceId`: Resultados por carrera
- `driverId`: Resultados por piloto
- `constructorId`: Resultados por equipo
- `position`: Ordenamiento por posición

**Constraint único:**
- `[raceId, driverId]`: Un piloto solo puede tener un resultado por carrera

**Casos de uso:**
```typescript
// Podio de una carrera
const podium = await prisma.result.findMany({
  where: {
    raceId: 'race-id-here',
    position: { lte: 3 }
  },
  orderBy: { position: 'asc' },
  include: { driver: true, constructor: true }
});

// Victorias de un piloto
const wins = await prisma.result.count({
  where: {
    driverId: 'hamilton-id',
    position: 1
  }
});
```

---

### Qualifying (Clasificación)
Almacena resultados de sesiones de clasificación.

**Campos clave:**
- `position`: Posición en parrilla
- `q1/q2/q3`: Tiempos de cada sesión

**Constraint único:**
- `[raceId, driverId]`: Un piloto solo puede tener un resultado de clasificación por carrera

---

### SprintResult (Resultados de Sprint)
Almacena resultados de carreras sprint (desde 2021).

**Campos clave:**
- Similar a `Result` pero para carreras sprint
- `points`: Puntos de sprint (diferentes a carrera principal)

---

## Standings (Clasificaciones)

### ConstructorStanding
Almacena clasificaciones del campeonato de constructores.

**Campos clave:**
- `year + round`: Clasificación en momento específico
- `position`: Posición en campeonato
- `points`: Puntos acumulados
- `wins`: Victorias acumuladas

**Constraint único:**
- `[year, round, constructorId]`: Una clasificación única por constructor/ronda/año

**Casos de uso:**
```typescript
// Clasificación actual de constructores
const standings = await prisma.constructorStanding.findMany({
  where: {
    year: 2024,
    round: { equals: await getLastRound(2024) }
  },
  orderBy: { position: 'asc' },
  include: { constructor: true }
});
```

---

## Estrategia de Migraciones

### Proceso de Desarrollo
```bash
# Crear migración
npx prisma migrate dev --name add_driver_stats

# Aplicar migraciones en producción
npx prisma migrate deploy

# Resetear base de datos (solo desarrollo)
npx prisma migrate reset
```

### Naming Convention
- `add_[entity]_[field]`: Agregar campo
- `create_[entity]`: Crear nueva tabla
- `alter_[entity]_[change]`: Modificar estructura
- `drop_[entity]_[field]`: Eliminar campo

---

## Optimizaciones

### Índices Compuestos (Futuro)
```prisma
// Para queries comunes como "resultados de un piloto en una temporada"
@@index([driverId, year])
@@index([constructorId, year])
```

### Particionamiento (Futuro)
Para escalar con millones de resultados:
- Particionar tabla `results` por año
- Particionar `qualifyings` por temporada

### Caché de Queries
```typescript
// Queries que deberían usar Redis
- Clasificación actual (TTL: 1 hora)
- Última carrera (TTL: 5 minutos post-carrera)
- Estadísticas de pilotos (TTL: 1 semana)
```

---

## Población Inicial de Datos

### Orden de Seeding
1. **Seasons**: Crear todas las temporadas (1950-2025)
2. **Circuits**: Poblar todos los circuitos históricos
3. **Drivers**: Poblar pilotos (selectivo, no todos desde 1950)
4. **Constructors**: Poblar equipos históricos
5. **Races**: Poblar carreras (selectivo por relevancia)
6. **Results**: Poblar resultados (incremental)

### Script de Seeding
```bash
npm run seed:seasons
npm run seed:circuits
npm run seed:current-season # Datos de temporada actual
```

---

## Métricas de Performance Esperadas

### Queries Objetivo
- Listado de pilotos: < 50ms
- Resultados de una carrera: < 30ms
- Clasificación actual: < 20ms (con caché)
- Historial de un piloto: < 100ms

### Tamaño Estimado de DB
- **1 temporada completa**: ~500 KB
- **Todas las temporadas (1950-2024)**: ~37 MB (datos core)
- **Con todos los resultados**: ~200-300 MB

---

## Próximos Pasos

1. ✅ Schema definido
2. ⏳ Crear primera migración
3. ⏳ Configurar conexión a PostgreSQL
4. ⏳ Crear scripts de seeding
5. ⏳ Poblar datos de prueba
6. ⏳ Crear servicios de API

---

## Referencias

- [Prisma Schema Reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference)
- [Jolpica F1 API](https://github.com/jolpica/jolpica-f1)
- [OpenF1 API](https://openf1.org/)
