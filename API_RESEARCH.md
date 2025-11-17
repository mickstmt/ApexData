# Investigación de APIs para ApexData

**Fecha de investigación**: 2025-11-17
**Propósito**: Documentar las fuentes de datos disponibles para ApexData y definir estrategia de integración.

---

## Resumen Ejecutivo

### ⚠️ Hallazgo Crítico
**Ergast API será descontinuada en 2025**. No se actualizará más allá de la temporada 2024.

### Estrategia Recomendada
Usar dos APIs complementarias:
1. **Jolpica F1** (sucesor de Ergast) - Datos históricos desde 1950
2. **OpenF1** - Datos de telemetría y tiempo real (sesiones 2023+)

---

## 1. Jolpica F1 API (Reemplazo de Ergast)

### Información General
- **URL Base**: `https://jolpi.ca/ergast/f1/`
- **Compatibilidad**: Backwards compatible con Ergast API
- **Cobertura**: Datos históricos desde 1950 hasta actualidad
- **Formato**: JSON y XML
- **Autenticación**: No requerida
- **Rate Limits**: Por confirmar en uso real
- **Licencia**: Apache 2.0 (Open Source)
- **Estado**: Activo, mantenido por voluntarios

### Actualización de Datos
- **Frecuencia**: Una actualización por fin de semana de carrera
- **Timing**: Lunes después del evento (puede haber retrasos)
- **Temporada actual**: 2025 será soportada

### Endpoints Disponibles (Compatible con Ergast)

#### Estructura Base
```
https://jolpi.ca/ergast/f1/{series}/{season}/{round}/{endpoint}.json
```

#### Endpoints Principales
| Endpoint | Descripción | Ejemplo |
|----------|-------------|---------|
| `/seasons` | Lista de temporadas | `/f1/seasons.json` |
| `/drivers` | Información de pilotos | `/f1/2024/drivers.json` |
| `/constructors` | Equipos/constructores | `/f1/2024/constructors.json` |
| `/circuits` | Circuitos | `/f1/circuits.json` |
| `/races` | Calendario de carreras | `/f1/2024.json` |
| `/results` | Resultados de carreras | `/f1/2024/1/results.json` |
| `/qualifying` | Resultados de clasificación | `/f1/2024/1/qualifying.json` |
| `/sprint` | Resultados de sprints | `/f1/2024/1/sprint.json` |
| `/standings/drivers` | Clasificación de pilotos | `/f1/2024/driverStandings.json` |
| `/standings/constructors` | Clasificación de constructores | `/f1/2024/constructorStandings.json` |
| `/laps` | Tiempos por vuelta | `/f1/2024/1/laps.json` |
| `/pitstops` | Paradas en boxes | `/f1/2024/1/pitstops.json` |

#### Filtros Disponibles
- Por circuito: `/circuits/{circuitId}/`
- Por constructor: `/constructors/{constructorId}/`
- Por piloto: `/drivers/{driverId}/`
- Por ronda: `/rounds/{round}` o `/rounds/last`
- Por posición en grid: `/grid/{position}`
- Por posición final: `/results/{position}`
- Por estado de carrera: `/status/{statusId}`

#### Paginación
```
?limit=30&offset=0
```

### Datos que Proporciona
- ✅ Temporadas completas (1950-2025)
- ✅ Información de pilotos (nombre, nacionalidad, fecha nacimiento, número)
- ✅ Información de equipos (nombre, nacionalidad, historia)
- ✅ Circuitos (nombre, ubicación, coordenadas)
- ✅ Resultados de carreras (posiciones, puntos, vueltas)
- ✅ Resultados de clasificación
- ✅ Resultados de sprints
- ✅ Clasificaciones (pilotos y constructores)
- ✅ Tiempos por vuelta
- ✅ Paradas en boxes
- ✅ Pole positions
- ✅ Vueltas rápidas
- ✅ Finishing status (completado, DNF, +laps)

### Limitaciones
- ❌ No tiene telemetría detallada (RPM, velocidad, throttle)
- ❌ No tiene datos de radio de equipo
- ❌ No tiene datos meteorológicos
- ❌ Actualización semanal (no tiempo real)
- ⚠️ Proyecto mantenido por voluntarios (riesgo de sostenibilidad)
- ⚠️ Costos de hosting ~$45 USD/mes (donaciones necesarias)

---

## 2. OpenF1 API

### Información General
- **URL Base**: `https://api.openf1.org/v1/`
- **Cobertura**: Datos desde 2023+ (temporadas recientes)
- **Formato**: JSON o CSV
- **Autenticación**: No requerida para datos históricos
- **Rate Limits**: Sin límites para acceso histórico
- **Timeout**: 10 segundos máximo por query
- **Latencia datos en vivo**: ~3 segundos (requiere cuenta paga)

### Actualización de Datos
- **Datos históricos**: Disponibles inmediatamente después de cada sesión
- **Datos en vivo**: Requiere cuenta paga (solicitud por formulario)

### Endpoints Disponibles (18 total)

| Endpoint | Descripción | Datos en Vivo | Post-Sesión |
|----------|-------------|---------------|-------------|
| `/car_data` | Telemetría detallada (RPM, velocidad, throttle, frenos) ~3.7Hz | ❌ | ✅ |
| `/drivers` | Información de pilotos por sesión | ✅ | ✅ |
| `/intervals` | Gaps entre pilotos y distancia al líder (~4 seg updates) | ❌ | ✅ |
| `/laps` | Detalles de vueltas individuales y tiempos de sectores | ✅ | ✅ |
| `/location` | Posición 3D en pista ~3.7Hz | ❌ | ✅ |
| `/meetings` | Información de fin de semana de GP | ✅ | ✅ |
| `/overtakes` (beta) | Registros de adelantamientos | Solo carreras | Solo carreras |
| `/pit` | Duración y timing de pit stops | ✅ | ✅ |
| `/position` | Cambios de posición de pilotos | ✅ | ✅ |
| `/race_control` | Banderas, incidentes, safety car | ✅ | ✅ |
| `/sessions` | Metadata de práctica/clasificación/carrera | ✅ | ✅ |
| `/session_result` (beta) | Clasificaciones finales y resultados | ✅ | ✅ |
| `/starting_grid` (beta) | Orden de parrilla basado en clasificación | ✅ | ✅ |
| `/stints` | Compuesto de neumáticos y rangos de vueltas | ✅ | ✅ |
| `/team_radio` | Grabaciones de audio y timestamps | ✅ | ✅ |
| `/weather` | Temperatura, viento, humedad (updates 1-min) | ✅ | ✅ |

### Estructura de Queries

#### Filtros Temporales
```
?date>2024-01-01
?date>=2024-01-01&date<=2024-12-31
?session_key=9158
```

#### Operadores Disponibles
- `>`, `<`, `>=`, `<=`, `=` para valores numéricos y fechas

#### Formato de Salida
```
?csv=true  # Para obtener CSV en lugar de JSON
```

### Atributos Clave de Datos

#### Identificadores
- `driver_number`: Número del piloto
- `session_key`: ID único de sesión
- `meeting_key`: ID único de evento/GP
- `circuit_key`: ID único de circuito

#### Datos de Performance
- `lap_duration`: Duración de vuelta
- `sector_1_time`, `sector_2_time`, `sector_3_time`
- `speed`: Velocidad en km/h
- `gear`: Marcha actual
- `rpm`: Revoluciones por minuto
- `throttle`: Acelerador (%)
- `brake`: Estado de frenos (boolean)

#### Datos de Estrategia
- `tire_compound`: Compuesto de neumático (SOFT, MEDIUM, HARD)
- `pit_duration`: Duración de pit stop
- `drs`: Estado del DRS
- `stint_number`: Número de stint

#### Datos Temporales
- Timestamps en formato ISO 8601 UTC
- `date`: Fecha del evento
- `lap_number`: Número de vuelta

### Datos que Proporciona
- ✅ Telemetría completa (RPM, velocidad, throttle, frenos, marchas)
- ✅ Posiciones GPS en pista (tracking 3D)
- ✅ Datos meteorológicos por sesión
- ✅ Radio de equipo (selección curada)
- ✅ Información de neumáticos y estrategia
- ✅ Gaps y tiempos entre pilotos
- ✅ Adelantamientos registrados
- ✅ Eventos de Race Control (banderas, safety car)

### Limitaciones
- ❌ Solo datos desde 2023 (no cubre historia completa)
- ❌ Datos en vivo requieren cuenta paga
- ❌ Radio de equipo es selección curada (no completo)
- ❌ Datos de adelantamientos incompletos durante carrera
- ⚠️ No hay datos de temporada actual en tiempo de clasificación

---

## 3. Estrategia de Integración para ApexData

### Distribución de Responsabilidades

#### Jolpica F1 (Histórico y Core Data)
**Uso primario para:**
- ✅ Datos históricos completos (1950-2024)
- ✅ Resultados de carreras y clasificaciones
- ✅ Información de pilotos y equipos
- ✅ Circuitos y calendarios
- ✅ Campeonatos y estadísticas
- ✅ Comparativas históricas

**Páginas que lo usarán:**
- Dashboard (tablas de campeonato)
- Calendario (histórico)
- Pilotos (listado y perfiles)
- Equipos (listado y perfiles)
- Temporadas (todas desde 1950)
- Circuitos (información básica)

#### OpenF1 (Telemetría y Datos Avanzados)
**Uso complementario para:**
- ✅ Telemetría detallada (2023+)
- ✅ Datos meteorológicos
- ✅ Estrategia de neumáticos
- ✅ Posiciones en vivo/replay
- ✅ Radio de equipo
- ✅ Análisis de vueltas avanzado

**Páginas que lo usarán:**
- Dashboard (última carrera con detalles)
- Detalle de carrera (análisis avanzado desde 2023)
- Página de análisis de telemetría (feature avanzado)

### Arquitectura de Datos Propuesta

#### Flujo de Datos
```
┌─────────────────────────────────────────────┐
│         APIs Externas                       │
├─────────────────────────────────────────────┤
│  Jolpica F1              OpenF1            │
│  (1950-2025)             (2023+)           │
│  Histórico               Telemetría         │
└──────────┬───────────────────┬──────────────┘
           │                   │
           ▼                   ▼
┌─────────────────────────────────────────────┐
│       Next.js API Routes (Backend)          │
│  ┌──────────────────────────────────────┐   │
│  │  Service Layer (Transformación)      │   │
│  │  - Normalización de datos            │   │
│  │  - Merge de ambas APIs               │   │
│  │  - Caché (Next.js + Redis opcional)  │   │
│  └──────────────────────────────────────┘   │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│       PostgreSQL (Prisma ORM)               │
│  ┌──────────────────────────────────────┐   │
│  │  Datos Core (caché persistente)      │   │
│  │  - Pilotos                           │   │
│  │  - Equipos                           │   │
│  │  - Circuitos                         │   │
│  │  - Temporadas                        │   │
│  │  - Resultados                        │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

#### Estrategia de Caché

**Datos a cachear en PostgreSQL:**
1. Pilotos (información básica, actualización semanal)
2. Equipos (información histórica, actualización semanal)
3. Circuitos (información estática, actualización anual)
4. Temporadas pasadas (datos inmutables, caché permanente)
5. Resultados históricos (inmutables, caché permanente)

**Datos a fetchear en cada request (con caché Next.js):**
1. Temporada actual (campeonato en curso)
2. Última carrera (dashboard)
3. Próxima carrera (calendario)
4. Telemetría de OpenF1 (datos pesados, no cachear en DB)

**Estrategia de revalidación:**
```typescript
// Datos estáticos (históricos)
export const revalidate = false; // Cache permanente

// Datos de temporada actual
export const revalidate = 3600; // Revalidar cada hora

// Última carrera
export const revalidate = 300; // Revalidar cada 5 minutos post-carrera
```

---

## 4. Plan de Implementación

### FASE 1: Setup Inicial
1. ✅ Investigar APIs (COMPLETADO)
2. ⏳ Crear servicios para consumir Jolpica F1
3. ⏳ Crear servicios para consumir OpenF1
4. ⏳ Implementar transformadores de datos
5. ⏳ Definir tipos TypeScript para respuestas

### FASE 2: Poblar Base de Datos
1. ⏳ Script de seeding inicial con datos de Jolpica
2. ⏳ Poblar pilotos históricos
3. ⏳ Poblar equipos históricos
4. ⏳ Poblar circuitos
5. ⏳ Poblar temporadas y resultados (selectivo, no todo)

### FASE 3: API Routes
1. ⏳ Endpoint `/api/drivers` (con filtros y paginación)
2. ⏳ Endpoint `/api/teams` (con filtros)
3. ⏳ Endpoint `/api/seasons` (con año específico)
4. ⏳ Endpoint `/api/circuits`
5. ⏳ Endpoint `/api/races` (calendario)
6. ⏳ Endpoint `/api/telemetry` (OpenF1, on-demand)

---

## 5. Riesgos y Mitigaciones

### Riesgo 1: Jolpica F1 es mantenido por voluntarios
**Mitigación:**
- Cachear agresivamente datos históricos en nuestra DB
- Considerar dump completo de datos hasta 2024
- Monitorear status del proyecto en GitHub
- Tener plan B: Dump de Ergast legacy data

### Riesgo 2: OpenF1 solo tiene datos desde 2023
**Mitigación:**
- Usar solo para features avanzados (no críticos)
- Marcar claramente en UI que telemetría solo está disponible 2023+
- Enfoque principal en Jolpica para datos históricos

### Riesgo 3: Rate limits no documentados
**Mitigación:**
- Implementar sistema de caché robusto
- Retry logic con exponential backoff
- Monitoreo de errores con Sentry
- Respetar límites con throttling

### Riesgo 4: Datos pueden estar desactualizados
**Mitigación:**
- Mostrar timestamp de última actualización en UI
- Implementar sistema de refresh manual
- Notificar a usuarios sobre delays conocidos

---

## 6. Ejemplo de Uso de APIs

### Jolpica F1 - Obtener última carrera
```bash
GET https://jolpi.ca/ergast/f1/current/last/results.json
```

### Jolpica F1 - Obtener campeonato actual de pilotos
```bash
GET https://jolpi.ca/ergast/f1/current/driverStandings.json
```

### Jolpica F1 - Comparar pilotos
```bash
GET https://jolpi.ca/ergast/f1/drivers/alonso.json
GET https://jolpi.ca/ergast/f1/drivers/hamilton.json
```

### OpenF1 - Telemetría de última sesión
```bash
GET https://api.openf1.org/v1/sessions?session_key=latest
GET https://api.openf1.org/v1/car_data?session_key={key}&driver_number=1
```

### OpenF1 - Datos meteorológicos
```bash
GET https://api.openf1.org/v1/weather?session_key={key}
```

---

## 7. Próximos Pasos

1. ✅ Documentación completada
2. ⏳ Inicializar proyecto Next.js
3. ⏳ Crear servicios de integración con APIs
4. ⏳ Definir esquema de base de datos
5. ⏳ Implementar primeros endpoints

---

**Conclusión**: Tenemos una estrategia sólida con dos APIs complementarias. Jolpica F1 será nuestra fuente principal de datos históricos y resultados, mientras que OpenF1 nos dará capacidades avanzadas de telemetría para carreras recientes. El caché agresivo en PostgreSQL nos protegerá contra interrupciones de servicio.
