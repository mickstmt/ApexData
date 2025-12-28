# Plan de Escalamiento - ApexData

## Análisis de Referencia

### f1-dash.com - Características Clave

**Funcionalidades Principales:**
- Dashboard de telemetría en tiempo real
- Track Map interactivo con posiciones live
- Clasificaciones y standings
- Weather data integration
- Timing data (gaps, lap times, sector times)
- Tyre compound indicators

**UI/UX Destacables:**
- Dark mode nativo (`#09090b`)
- PWA (Progressive Web App) instalable
- Sidebar colapsable responsive
- Indicador de sincronización "Syncing..."
- Arquitectura Next.js con SSR
- Mobile-first design

### FastF1 - Capacidades

**Datos Disponibles:**
- ✅ Telemetría completa: Speed, RPM, Throttle, Brake, Gear, DRS
- ✅ Car positioning (coordenadas X, Y, Z)
- ✅ Weather data detallado
- ✅ Tyre compound data y stint information
- ✅ Lap times y sector times
- ✅ Radio messages (transcripciones)
- ✅ Datos históricos desde 2018+

**Ventajas Técnicas:**
- Usa Pandas DataFrames (fácil manipulación)
- Integración con Matplotlib
- Sistema de cache integrado
- Compatible con API Jolpica/Ergast
- Funciones custom para análisis F1

## Arquitectura Propuesta

```
┌─────────────────────────────────────────┐
│   Frontend (Next.js + React)            │
│   - Dashboard visualizations            │
│   - Real-time updates                   │
│   - Track maps                          │
│   - Comparative analytics               │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Backend API (Next.js API Routes)      │
│   - Prisma (PostgreSQL/Supabase)        │
│   - Jolpica F1 (datos históricos)       │
│   - OpenF1 (datos live 2023+)           │
│   - Cache layer (Redis opcional)        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Python Microservice (FastF1)          │
│   - Procesamiento de telemetría         │
│   - Análisis avanzado de rendimiento    │
│   - Cache de datos preprocessados       │
│   - REST API (FastAPI)                  │
│   - Export a JSON para Next.js          │
└─────────────────────────────────────────┘
```

## Plan de Desarrollo por Fases

### FASE 1: Análisis de Telemetría (Fundación)

**Objetivo:** Integrar FastF1 y establecer pipeline de datos de telemetría

#### 1.1 Microservicio Python
- [ ] Setup proyecto Python con FastAPI
- [ ] Integrar FastF1
- [ ] Crear endpoints REST:
  - `GET /api/telemetry/:session/:driver` - Telemetría de un piloto
  - `GET /api/laps/:session` - Lap times de sesión
  - `GET /api/weather/:session` - Datos meteorológicos
  - `GET /api/positions/:session` - Posiciones en pista
- [ ] Implementar cache (archivo local o Redis)
- [ ] Dockerizar servicio

#### 1.2 Extensión Schema Prisma
```prisma
model Telemetry {
  id            String   @id @default(cuid())
  sessionId     String
  driverId      String
  lap           Int
  time          Float    // Segundos desde inicio sesión
  speed         Float    // km/h
  rpm           Int
  nGear         Int
  throttle      Float    // 0-100%
  brake         Boolean
  drs           Int      // 0-14 (DRS state)

  createdAt     DateTime @default(now())

  @@index([sessionId, driverId])
  @@map("telemetry")
}

model Position {
  id            String   @id @default(cuid())
  sessionId     String
  driverId      String
  time          Float
  x             Float    // Coordenada X
  y             Float    // Coordenada Y
  z             Float    // Coordenada Z

  createdAt     DateTime @default(now())

  @@index([sessionId, driverId])
  @@map("positions")
}

model TyreStint {
  id            String   @id @default(cuid())
  raceId        String
  driverId      String
  compound      String   // SOFT, MEDIUM, HARD, etc.
  lapStart      Int
  lapEnd        Int
  totalLaps     Int

  createdAt     DateTime @default(now())

  @@index([raceId, driverId])
  @@map("tyre_stints")
}

model WeatherData {
  id            String   @id @default(cuid())
  sessionId     String
  time          Float
  airTemp       Float    // °C
  trackTemp     Float    // °C
  humidity      Float    // %
  pressure      Float    // mbar
  windSpeed     Float    // m/s
  windDirection Int      // grados
  rainfall      Boolean

  createdAt     DateTime @default(now())

  @@index([sessionId])
  @@map("weather_data")
}
```

#### 1.3 API Routes Next.js
- [ ] `/api/telemetry/[session]/[driver]` - Proxy a Python service
- [ ] `/api/analysis/lap-comparison` - Comparar vueltas
- [ ] `/api/analysis/sector-times` - Análisis de sectores

---

### FASE 2: Visualizaciones Avanzadas

**Objetivo:** Implementar componentes visuales interactivos inspirados en f1-dash

#### 2.1 Track Map Component
- [ ] Crear componente `<TrackMap />`
- [ ] Integrar SVG de circuitos (o generarlos desde coordenadas)
- [ ] Renderizar posiciones de autos en tiempo real
- [ ] Mostrar DRS zones
- [ ] Indicadores de sectores
- [ ] Tooltips con info de piloto al hover
- **Tecnologías:** D3.js o Canvas API + React

#### 2.2 Telemetry Charts
- [ ] Componente `<TelemetryChart />`
  - Speed traces (múltiples pilotos overlay)
  - Throttle/Brake comparison
  - Gear changes visualization
  - RPM analysis
- [ ] Componente `<LapTimeChart />`
  - Evolución de tiempos por vuelta
  - Comparación entre pilotos
  - Highlighting fastest laps
- **Tecnologías:** Recharts + custom tooltips

#### 2.3 Race Dashboard Live
- [ ] Componente `<LiveTimingTable />`
  - Posiciones en tiempo real
  - Gap al líder y al anterior
  - Última vuelta + mejor vuelta
  - Neumático actual
  - Número de pit stops
- [ ] Componente `<TyreStrategyViz />`
  - Timeline de stints
  - Color-coded por compound
  - Predicción de próximo pit stop
- [ ] Componente `<WeatherWidget />`
  - Temperatura pista/aire
  - Probabilidad de lluvia
  - Wind speed/direction
- **Tecnologías:** WebSocket o Server-Sent Events para updates

---

### FASE 3: Features Avanzadas e Interactividad

**Objetivo:** Análisis profundo y comparaciones multi-piloto

#### 3.1 Comparador de Vueltas
- [ ] UI para seleccionar 2+ pilotos y vueltas específicas
- [ ] Overlay de telemetría sincronizado
- [ ] Heatmap de diferencias de velocidad
- [ ] Visualización de dónde se gana/pierde tiempo
- [ ] Export de comparación (PNG/PDF)

#### 3.2 Análisis de Rendimiento
- [ ] Dashboard de estadísticas por piloto:
  - Promedio velocidad máxima
  - Consistency score (desviación estándar lap times)
  - Brake points analysis
  - Corner speed comparison
- [ ] Gráficos de degradación de neumáticos
- [ ] Predictor de estrategia óptima

#### 3.3 Datos Históricos
- [ ] Comparación año vs año (mismo circuito)
- [ ] Evolution de lap records
- [ ] Head-to-head histórico entre pilotos
- [ ] Championship simulator ("what if" scenarios)

---

### FASE 4: Optimizaciones y Mejoras UX

**Objetivo:** Performance, accesibilidad y experiencia de usuario

#### 4.1 Performance
- [ ] Implementar Server Components (Next.js 15)
- [ ] Lazy loading de charts
- [ ] Virtual scrolling para tablas grandes
- [ ] Image optimization (Next.js Image)
- [ ] Bundle size reduction
- [ ] Cache strategies (SWR o React Query)

#### 4.2 PWA y Mobile
- [ ] Configurar manifest.json
- [ ] Service Worker para offline support
- [ ] Push notifications (race start, fastest lap, etc.)
- [ ] Optimización mobile (touch gestures en track map)

#### 4.3 Temas y Personalización
- [ ] Dark/Light mode toggle (con next-themes ya integrado)
- [ ] Esquemas de color por equipo
- [ ] Layouts customizables (drag-and-drop widgets)
- [ ] Favoritos de pilotos/equipos

---

## Stack Tecnológico Detallado

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI:** React 19 + TypeScript
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui (Radix UI)
- **Animations:** Framer Motion + GSAP (opcional para track map)
- **Charts:**
  - Recharts (básicos)
  - D3.js (custom/avanzados)
  - Canvas API (animaciones fluidas)
- **State:** Zustand o Jotai (ligero)
- **Data Fetching:** SWR o TanStack Query

### Backend
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **APIs Externas:**
  - Jolpica F1 (históricos 1950-2025)
  - OpenF1 (live 2023+)
- **Cache:** Redis (opcional, para datos frecuentes)

### Python Microservice
- **Framework:** FastAPI
- **Telemetría:** FastF1
- **Data Processing:** Pandas + NumPy
- **Cache:** Pickle files o Redis
- **Deploy:** Docker container

### DevOps
- **Hosting:** Vercel (Next.js) + Railway/Render (Python)
- **Database:** Supabase
- **Monitoring:** Sentry (errors) + Vercel Analytics
- **CI/CD:** GitHub Actions

---

## Mejoras Visuales Inmediatas (Quick Wins)

Inspiradas en f1-dash.com:

1. **Dark Theme como Default**
   - Color base: `#09090b`
   - Accent colors por equipo F1
   - Skeleton loaders durante fetch

2. **Navegación Mejorada**
   - Sidebar colapsable
   - Breadcrumbs
   - Tabs para secciones (Dashboard, Track Map, Standings, etc.)

3. **Status Indicators**
   - Live/Offline badge
   - "Syncing..." durante updates
   - Last updated timestamp

4. **Responsive Data Tables**
   - Sticky headers
   - Horizontal scroll en mobile
   - Highlight row on hover

5. **Loading States**
   - Shimmer effect placeholders
   - Progress bars para data-heavy operations

---

## Priorización Sugerida

### Sprint 1 (1-2 semanas)
- ✅ Setup microservicio Python + FastF1
- ✅ Crear endpoints básicos telemetría
- ✅ Extender schema Prisma
- ✅ Primer componente de chart (lap times)

### Sprint 2 (2 semanas)
- ✅ Track Map básico (estático)
- ✅ Live Timing Table
- ✅ Tyre Strategy visualization

### Sprint 3 (2 semanas)
- ✅ Telemetry comparison charts
- ✅ Weather integration
- ✅ Performance optimization

### Sprint 4+ (ongoing)
- ✅ Features avanzadas (comparador, predictor)
- ✅ PWA implementation
- ✅ Mobile refinement

---

## Decisión Inmediata

**¿Por dónde empezar?**

Dos rutas recomendadas:

### Opción A: Data-First (Recomendada)
1. Setup Python microservice con FastF1
2. Crear endpoint de telemetría
3. Consumir desde Next.js
4. Crear primer chart simple
**Ventaja:** Fundación sólida de datos para todo lo demás

### Opción B: Visual-First
1. Implementar Track Map con datos mock
2. Crear componentes de visualización
3. Integrar datos reales después
**Ventaja:** Resultados visuales rápidos, motivación alta

---

## Recursos y Referencias

**Documentación:**
- [FastF1 Docs](https://docs.fastf1.dev/)
- [FastF1 GitHub](https://github.com/theOehrly/Fast-F1)
- [OpenF1 API](https://openf1.org/)
- [Jolpica F1 API](https://jolpi.ca/ergast/f1)

**Inspiración:**
- [f1-dash.com](https://f1-dash.com)
- [F1 Official](https://www.formula1.com/)

**Tutoriales FastF1:**
- [Data in Motorsport Tutorial](https://www.thedataschool.com.au/jonathan-carter/data-in-motorsport-acquiring-formula-1-telemetry-data-using-python-and-fastf1/)
- [FastF1 Core Documentation](https://docs.fastf1.dev/core.html)

---

**Última actualización:** 2025-12-01
