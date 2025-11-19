# 📋 Plan Maestro de Desarrollo - ApexData

## 🎯 Visión del Proyecto

**ApexData** es una plataforma moderna y elegante de datos de Fórmula 1 que combina información histórica (1950-presente) con telemetría en tiempo real, ofreciendo una experiencia visual innovadora y seria con énfasis en la paleta de colores verde limón (#CCFF00), blanco y negro.

---

## 📊 Estado Actual del Proyecto

```
✅ FASE 0: Investigación y Setup Inicial (100%)
✅ FASE 1: Backend - API y Base de Datos (100%)
⏳ FASE 2: Frontend - Estructura Base y Componentes (0%)
⏳ FASE 3: Frontend - Páginas Principales (0%)
⏳ FASE 4: Optimización y Mejoras Visuales (0%)
⏳ FASE 5: Features Avanzadas (0%)
⏳ FASE 6: Testing y QA (0%)
⏳ FASE 7: Deployment y Documentación (0%)
```

---

## 🏗️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Lenguaje**: TypeScript 5.9
- **Estilos**: Tailwind CSS v3
- **Componentes**: shadcn/ui
- **Animaciones**: Framer Motion + GSAP

### Backend
- **Framework**: Next.js API Routes
- **Base de Datos**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **APIs Externas**:
  - Jolpica F1 API (datos históricos)
  - OpenF1 API (telemetría en tiempo real)

### DevOps & Deployment
- **Control de versiones**: Git + GitHub
- **Hosting**: Por definir (Vercel recomendado)
- **CI/CD**: Por definir

---

## 📅 FASE 0: Investigación y Setup Inicial ✅

**Estado**: Completada

### Objetivos Cumplidos
- ✅ Investigación de APIs disponibles
- ✅ Selección de stack tecnológico
- ✅ Configuración de proyecto Next.js 15
- ✅ Setup de Git y GitHub
- ✅ Definición de arquitectura

### Entregables
- Documento `API_RESEARCH.md` con análisis de Jolpica F1 y OpenF1
- Proyecto inicializado con todas las dependencias
- Repositorio GitHub: `mickstmt/ApexData`

---

## 📅 FASE 1: Backend - API y Base de Datos ✅

**Estado**: Completada

### Objetivos Cumplidos
- ✅ Configuración de Supabase (PostgreSQL)
- ✅ Diseño de esquema de base de datos (9 modelos)
- ✅ Configuración de Prisma ORM
- ✅ Migraciones de base de datos
- ✅ Creación de tipos TypeScript (41 interfaces)
- ✅ Servicio de integración con Jolpica F1 API
- ✅ Implementación de 5 API Routes
- ✅ Scripts de seeding con datos reales

### Arquitectura de Datos

#### Modelos de Prisma (9 tablas)
1. **Driver** - Información de pilotos
2. **Constructor** - Equipos/escuderías
3. **Circuit** - Circuitos históricos y actuales
4. **Season** - Temporadas de F1
5. **Race** - Grandes premios
6. **Result** - Resultados de carreras
7. **Qualifying** - Resultados de clasificación
8. **SprintResult** - Resultados de carreras sprint
9. **ConstructorStanding** - Posiciones del campeonato de constructores

#### API Routes Implementadas
- `GET /api/drivers` - Lista de pilotos con filtros
- `GET /api/drivers/[driverId]` - Detalles de piloto específico
- `GET /api/constructors` - Lista de constructores
- `GET /api/seasons/[year]` - Información de temporada y calendario
- `GET /api/standings/current` - Standings actuales

### Datos en Base de Datos
- ✅ 30 circuitos históricos
- ✅ 6 temporadas (2020-2025)
- ✅ 21 pilotos de la temporada 2025
- ✅ 10 constructores activos

### Archivos Clave
- `prisma/schema.prisma` - Esquema de base de datos
- `prisma/seed.ts` - Script de seeding
- `src/types/api/jolpica.ts` - Tipos de Jolpica F1 API
- `src/types/api/openf1.ts` - Tipos de OpenF1 API
- `src/services/jolpica/client.ts` - Cliente de Jolpica F1
- `src/services/jolpica/transformers.ts` - Transformadores de datos
- `src/lib/prisma.ts` - Cliente de Prisma
- `DATABASE_SCHEMA.md` - Documentación de esquema

---

## 📅 FASE 2: Frontend - Estructura Base y Componentes

**Estado**: Pendiente (0%)

### Objetivos
Crear la estructura visual profesional con diseño elegante, serio e innovador.

### Tareas (7)

#### 2.1 Layout Principal
- [ ] Crear componente `Header` con logo y navegación
- [ ] Crear componente `Footer` con información del proyecto
- [ ] Implementar layout responsive (mobile-first)
- [ ] Configurar estructura de rutas

**Archivos a crear:**
- `src/components/layout/Header.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/layout/MainLayout.tsx`
- `src/app/layout.tsx` (actualizar)

#### 2.2 Sistema de Navegación
- [ ] Menú principal: Home, Pilotos, Equipos, Calendario, Standings
- [ ] Navegación móvil (hamburger menu)
- [ ] Indicador de página activa
- [ ] Transiciones suaves

**Archivos a crear:**
- `src/components/navigation/MainNav.tsx`
- `src/components/navigation/MobileNav.tsx`
- `src/components/navigation/NavLink.tsx`

#### 2.3 Página de Inicio (Home)
- [ ] Hero section con título impactante
- [ ] Sección "Latest Results" (últimas carreras)
- [ ] Sección "Current Standings" (top 3 pilotos y equipos)
- [ ] Cards con estadísticas destacadas
- [ ] Animaciones de entrada

**Archivos a crear:**
- `src/app/page.tsx` (actualizar)
- `src/components/home/HeroSection.tsx`
- `src/components/home/LatestResults.tsx`
- `src/components/home/CurrentStandings.tsx`
- `src/components/home/StatsCards.tsx`

#### 2.4 Página de Pilotos
- [ ] Grid de tarjetas de pilotos
- [ ] Filtros por nacionalidad y equipo
- [ ] Búsqueda en tiempo real
- [ ] Vista de lista/grid toggle
- [ ] Paginación o scroll infinito

**Archivos a crear:**
- `src/app/drivers/page.tsx`
- `src/components/drivers/DriverCard.tsx`
- `src/components/drivers/DriverFilters.tsx`
- `src/components/drivers/DriverSearch.tsx`
- `src/components/drivers/DriverGrid.tsx`

#### 2.5 Página de Detalle de Piloto
- [ ] Información completa del piloto
- [ ] Estadísticas de carrera
- [ ] Historial de resultados
- [ ] Gráficos de rendimiento
- [ ] Comparación con otros pilotos

**Archivos a crear:**
- `src/app/drivers/[driverId]/page.tsx`
- `src/components/drivers/DriverProfile.tsx`
- `src/components/drivers/DriverStats.tsx`
- `src/components/drivers/DriverHistory.tsx`

#### 2.6 Página de Equipos/Constructores
- [ ] Grid de tarjetas de equipos con colores oficiales
- [ ] Información de cada equipo
- [ ] Pilotos actuales del equipo
- [ ] Historial de campeonatos

**Archivos a crear:**
- `src/app/constructors/page.tsx`
- `src/components/constructors/ConstructorCard.tsx`
- `src/components/constructors/ConstructorGrid.tsx`

#### 2.7 Sistema de Componentes Reutilizables
- [ ] Card component (múltiples variantes)
- [ ] Button variants (primary, secondary, outline, ghost)
- [ ] Loading states (skeleton, spinner)
- [ ] Error boundaries
- [ ] Typography system
- [ ] Badge/Tag components
- [ ] Modal/Dialog components

**Archivos a crear:**
- `src/components/ui/Card.tsx`
- `src/components/ui/Loading.tsx`
- `src/components/ui/ErrorBoundary.tsx`
- `src/components/ui/Typography.tsx`
- `src/components/ui/Badge.tsx`

### Diseño Visual

**Principios:**
- Minimalista y moderno
- Alto contraste (negro/blanco con acentos lime)
- Inspirado en telemetría F1
- Animaciones sutiles y elegantes
- Totalmente responsive

**Paleta de Colores:**
- **Primary**: `#CCFF00` (verde limón) - Acentos, CTAs, highlights
- **Background Light**: `#FFFFFF` (blanco)
- **Background Dark**: `#000000` (negro)
- **Text Light**: `#FAFAFA` (gris muy claro)
- **Text Dark**: `#0A0A0A` (casi negro)
- **Borders**: Grises sutiles para separación

### Criterios de Éxito
- Layout responsive funcional en mobile, tablet y desktop
- Navegación fluida entre páginas
- Componentes reutilizables documentados
- Performance: Time to Interactive < 3s
- Accesibilidad: Contraste WCAG AA mínimo

---

## 📅 FASE 3: Frontend - Páginas Principales

**Estado**: Pendiente (0%)

### Objetivos
Completar todas las páginas principales con datos reales y funcionalidad completa.

### Tareas (5)

#### 3.1 Página de Calendario
- [ ] Lista de carreras de la temporada actual
- [ ] Indicador de carreras pasadas/futuras/en curso
- [ ] Detalles de cada circuito
- [ ] Horarios en zona horaria local
- [ ] Vista de calendario visual

**Archivos a crear:**
- `src/app/calendar/page.tsx`
- `src/components/calendar/RaceCalendar.tsx`
- `src/components/calendar/RaceCard.tsx`
- `src/components/calendar/CircuitInfo.tsx`

#### 3.2 Página de Standings (Clasificación)
- [ ] Tabla de clasificación de pilotos
- [ ] Tabla de clasificación de constructores
- [ ] Filtro por temporada
- [ ] Gráficos de evolución de puntos
- [ ] Comparación entre pilotos/equipos

**Archivos a crear:**
- `src/app/standings/page.tsx`
- `src/components/standings/DriversStandings.tsx`
- `src/components/standings/ConstructorsStandings.tsx`
- `src/components/standings/StandingsChart.tsx`

#### 3.3 Página de Detalle de Carrera
- [ ] Resultados finales
- [ ] Resultados de clasificación
- [ ] Resultados de sprint (si aplica)
- [ ] Información del circuito
- [ ] Highlights y estadísticas

**Archivos a crear:**
- `src/app/races/[raceId]/page.tsx`
- `src/components/races/RaceResults.tsx`
- `src/components/races/QualifyingResults.tsx`
- `src/components/races/RaceHighlights.tsx`

#### 3.4 Página de Detalle de Constructor
- [ ] Información completa del equipo
- [ ] Pilotos actuales e históricos
- [ ] Estadísticas del equipo
- [ ] Historial de campeonatos
- [ ] Colores y livery

**Archivos a crear:**
- `src/app/constructors/[constructorId]/page.tsx`
- `src/components/constructors/ConstructorProfile.tsx`
- `src/components/constructors/ConstructorStats.tsx`
- `src/components/constructors/TeamDrivers.tsx`

#### 3.5 Página de Búsqueda Global
- [ ] Búsqueda unificada (pilotos, equipos, carreras)
- [ ] Filtros avanzados
- [ ] Resultados agrupados por categoría
- [ ] Búsqueda con autocompletado

**Archivos a crear:**
- `src/app/search/page.tsx`
- `src/components/search/SearchBar.tsx`
- `src/components/search/SearchResults.tsx`
- `src/components/search/SearchFilters.tsx`

### Criterios de Éxito
- Todas las páginas principales funcionales
- Datos reales cargados desde API/DB
- Experiencia de usuario fluida
- Loading states en todas las peticiones
- Error handling robusto

---

## 📅 FASE 4: Optimización y Mejoras Visuales

**Estado**: Pendiente (0%)

### Objetivos
Pulir la experiencia visual con animaciones, transiciones y optimizaciones de rendimiento.

### Tareas (6)

#### 4.1 Animaciones y Transiciones
- [ ] Implementar Framer Motion para animaciones de página
- [ ] Transiciones suaves entre rutas
- [ ] Animaciones de carga (skeleton screens)
- [ ] Micro-interacciones en botones y cards
- [ ] Efectos hover elegantes

**Librerías a usar:**
- Framer Motion
- GSAP (opcional para animaciones complejas)

#### 4.2 Tema Oscuro/Claro
- [ ] Implementar toggle de tema
- [ ] Persistir preferencia del usuario
- [ ] Ajustar todos los componentes
- [ ] Transición suave entre temas

**Archivos a crear:**
- `src/components/ThemeToggle.tsx`
- `src/contexts/ThemeContext.tsx`
- `src/hooks/useTheme.ts`

#### 4.3 Optimización de Imágenes
- [ ] Implementar Next.js Image para todas las imágenes
- [ ] Lazy loading de imágenes
- [ ] Placeholders blur
- [ ] Optimización de formatos (WebP, AVIF)

#### 4.4 Performance Optimization
- [ ] Code splitting por ruta
- [ ] Dynamic imports para componentes pesados
- [ ] Memoización de componentes caros
- [ ] Virtualización para listas largas
- [ ] Prefetch de rutas críticas

#### 4.5 SEO y Meta Tags
- [ ] Meta tags dinámicos por página
- [ ] Open Graph tags
- [ ] Twitter Cards
- [ ] Sitemap.xml
- [ ] robots.txt

**Archivos a crear:**
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/components/seo/MetaTags.tsx`

#### 4.6 Accesibilidad (A11y)
- [ ] ARIA labels en todos los componentes
- [ ] Navegación por teclado
- [ ] Focus management
- [ ] Skip links
- [ ] Contraste de colores WCAG AA

### Criterios de Éxito
- Lighthouse Score > 90 en todas las categorías
- Animaciones fluidas 60fps
- Tema oscuro completamente funcional
- Accesibilidad WCAG AA compliant

---

## 📅 FASE 5: Features Avanzadas

**Estado**: Pendiente (0%)

### Objetivos
Implementar características avanzadas que diferencien a ApexData.

### Tareas (5)

#### 5.1 Telemetría en Tiempo Real (OpenF1)
- [ ] Integración con OpenF1 API
- [ ] Visualización de datos de telemetría
- [ ] Gráficos de velocidad, throttle, brake, DRS
- [ ] Comparación de vueltas
- [ ] Live timing durante carreras

**Archivos a crear:**
- `src/services/openf1/client.ts`
- `src/components/telemetry/TelemetryChart.tsx`
- `src/components/telemetry/LiveTiming.tsx`
- `src/app/telemetry/page.tsx`

#### 5.2 Comparador de Pilotos
- [ ] Selección de múltiples pilotos
- [ ] Comparación de estadísticas
- [ ] Gráficos comparativos
- [ ] Head-to-head histórico

**Archivos a crear:**
- `src/app/compare/page.tsx`
- `src/components/compare/PilotSelector.tsx`
- `src/components/compare/ComparisonChart.tsx`

#### 5.3 Sistema de Favoritos
- [ ] Marcar pilotos/equipos favoritos
- [ ] Dashboard personalizado
- [ ] Notificaciones (opcional)
- [ ] Persistencia en localStorage

**Archivos a crear:**
- `src/contexts/FavoritesContext.tsx`
- `src/components/favorites/FavoriteButton.tsx`
- `src/app/favorites/page.tsx`

#### 5.4 Estadísticas Avanzadas
- [ ] Análisis histórico de rendimiento
- [ ] Predicciones basadas en datos
- [ ] Tendencias y patrones
- [ ] Visualizaciones interactivas

**Archivos a crear:**
- `src/app/stats/page.tsx`
- `src/components/stats/PerformanceChart.tsx`
- `src/components/stats/TrendsAnalysis.tsx`

#### 5.5 Exportación de Datos
- [ ] Exportar tablas a CSV
- [ ] Exportar gráficos como imagen
- [ ] Compartir resultados en redes sociales
- [ ] Generar PDFs de resúmenes

**Archivos a crear:**
- `src/utils/export.ts`
- `src/components/export/ExportButton.tsx`

### Criterios de Éxito
- Telemetría en tiempo real funcionando
- Comparador intuitivo y rápido
- Favoritos persistentes
- Exportación sin errores

---

## 📅 FASE 6: Testing y QA

**Estado**: Pendiente (0%)

### Objetivos
Garantizar calidad y estabilidad del código mediante pruebas exhaustivas.

### Tareas (5)

#### 6.1 Unit Testing
- [ ] Tests para utilidades y helpers
- [ ] Tests para transformadores de datos
- [ ] Tests para hooks personalizados
- [ ] Cobertura > 80%

**Framework**: Jest + React Testing Library

#### 6.2 Integration Testing
- [ ] Tests de API Routes
- [ ] Tests de flujos completos
- [ ] Tests de interacción con base de datos

#### 6.3 E2E Testing
- [ ] Tests de flujos críticos de usuario
- [ ] Tests de navegación
- [ ] Tests de formularios
- [ ] Tests cross-browser

**Framework**: Playwright o Cypress

#### 6.4 Performance Testing
- [ ] Lighthouse CI
- [ ] Web Vitals monitoring
- [ ] Bundle size analysis
- [ ] Load testing

#### 6.5 Bug Fixing y Refinamiento
- [ ] Corrección de bugs encontrados
- [ ] Refinamiento de UX
- [ ] Optimizaciones finales

### Criterios de Éxito
- Cobertura de tests > 80%
- Todos los flujos críticos testeados
- 0 bugs críticos
- Performance optimizado

---

## 📅 FASE 7: Deployment y Documentación

**Estado**: Pendiente (0%)

### Objetivos
Preparar el proyecto para producción y documentar todo el proceso.

### Tareas (6)

#### 7.1 Preparación para Producción
- [ ] Variables de entorno de producción
- [ ] Optimización de build
- [ ] Configuración de CDN
- [ ] Compresión de assets

#### 7.2 Deployment
- [ ] Deploy en Vercel (recomendado)
- [ ] Configuración de dominio personalizado
- [ ] SSL/HTTPS
- [ ] Configuración de Analytics

#### 7.3 CI/CD Pipeline
- [ ] GitHub Actions para tests
- [ ] Deploy automático en merge a main
- [ ] Preview deployments para PRs
- [ ] Rollback strategy

#### 7.4 Monitoreo y Logging
- [ ] Error tracking (Sentry)
- [ ] Analytics (Google Analytics / Vercel Analytics)
- [ ] Performance monitoring
- [ ] Uptime monitoring

#### 7.5 Documentación Técnica
- [ ] README.md completo
- [ ] Guía de contribución
- [ ] Documentación de API
- [ ] Guía de deployment
- [ ] Arquitectura del proyecto

**Archivos a crear:**
- `README.md` (actualizar)
- `CONTRIBUTING.md`
- `API_DOCUMENTATION.md`
- `DEPLOYMENT_GUIDE.md`
- `ARCHITECTURE.md`

#### 7.6 Documentación de Usuario
- [ ] Guía de uso de la plataforma
- [ ] FAQ
- [ ] Tutoriales en video (opcional)
- [ ] Changelog

**Archivos a crear:**
- `docs/USER_GUIDE.md`
- `docs/FAQ.md`
- `CHANGELOG.md`

### Criterios de Éxito
- Aplicación desplegada y accesible
- CI/CD funcionando correctamente
- Documentación completa
- Monitoreo activo

---

## 🎨 Guía de Estilo Visual

### Colores

```css
/* Primary Colors */
--apex-lime: #CCFF00;        /* Verde limón - Acentos */
--apex-black: #000000;       /* Negro - Fondos oscuros */
--apex-white: #FFFFFF;       /* Blanco - Fondos claros */

/* Secondary Colors */
--apex-gray-50: #FAFAFA;     /* Texto claro */
--apex-gray-100: #F5F5F5;    /* Backgrounds sutiles */
--apex-gray-200: #E5E5E5;    /* Borders */
--apex-gray-600: #737373;    /* Texto secundario */
--apex-gray-900: #0A0A0A;    /* Texto oscuro */

/* Semantic Colors */
--apex-success: #10B981;     /* Verde - Éxito */
--apex-error: #EF4444;       /* Rojo - Error */
--apex-warning: #F59E0B;     /* Amarillo - Advertencia */
--apex-info: #3B82F6;        /* Azul - Información */
```

### Tipografía

```css
/* Font Family */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'Fira Code', 'Courier New', monospace;

/* Font Sizes */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
--text-5xl: 3rem;        /* 48px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Espaciado

```css
/* Spacing Scale (basado en 4px) */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Border Radius

```css
--radius-sm: 0.25rem;   /* 4px */
--radius-md: 0.5rem;    /* 8px */
--radius-lg: 0.75rem;   /* 12px */
--radius-xl: 1rem;      /* 16px */
--radius-full: 9999px;  /* Circular */
```

---

## 📝 Convenciones de Código

### Estructura de Carpetas

```
src/
├── app/                      # Next.js App Router
│   ├── (routes)/            # Rutas agrupadas
│   ├── api/                 # API Routes
│   └── layout.tsx           # Layout principal
├── components/              # Componentes React
│   ├── ui/                  # Componentes base reutilizables
│   ├── layout/              # Componentes de layout
│   ├── home/                # Componentes específicos de home
│   └── [feature]/           # Componentes por feature
├── lib/                     # Utilidades y helpers
├── hooks/                   # Custom React hooks
├── contexts/                # React contexts
├── services/                # Servicios de API
├── types/                   # Tipos TypeScript
├── config/                  # Configuración
└── styles/                  # Estilos globales
```

### Naming Conventions

- **Componentes**: PascalCase (`DriverCard.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useDrivers.ts`)
- **Utils**: camelCase (`formatDate.ts`)
- **Constantes**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Tipos/Interfaces**: PascalCase (`DriverProfile`)

### Git Commit Messages

```
feat: Add driver comparison feature
fix: Correct standings calculation
docs: Update API documentation
style: Format code with Prettier
refactor: Simplify data transformation
test: Add tests for driver service
chore: Update dependencies
```

---

## 🚀 Comandos Útiles

```bash
# Desarrollo
npm run dev              # Iniciar servidor de desarrollo
npm run build            # Build de producción
npm run start            # Iniciar servidor de producción
npm run lint             # Linter
npm run type-check       # TypeScript type checking

# Base de Datos
npm run db:seed          # Poblar base de datos
npx prisma studio        # Abrir Prisma Studio
npx prisma generate      # Generar Prisma Client
npx prisma migrate dev   # Crear migración

# Testing (cuando se implemente)
npm run test             # Ejecutar tests
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Cobertura de tests
npm run test:e2e         # Tests E2E
```

---

## 📚 Recursos y Referencias

### Documentación Oficial
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com)

### APIs
- [Jolpica F1 API](https://jolpi.ca/ergast/)
- [OpenF1 API](https://openf1.org)

### Herramientas
- [Supabase Dashboard](https://supabase.com/dashboard)
- [GitHub Repository](https://github.com/mickstmt/ApexData)

---

## 📞 Contacto y Soporte

- **Desarrollador**: mickstmt
- **Repositorio**: https://github.com/mickstmt/ApexData
- **Documentación**: Ver carpeta `/docs`

---

**Última actualización**: 2025-11-19
**Versión del documento**: 1.0
