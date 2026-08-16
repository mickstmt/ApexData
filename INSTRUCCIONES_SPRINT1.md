# Instrucciones de Ejecución - Sprint 1: Imágenes

## Problema Detectado
PowerShell tiene restricciones de ejecución de scripts. Necesitas ejecutar los comandos manualmente.

---

## Pasos a Seguir

### 1. Habilitar Ejecución de Scripts (Temporal)

Abre PowerShell **como Administrador** y ejecuta:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

Esto habilita la ejecución de scripts **solo para la sesión actual** de PowerShell.

---

### 2. Aplicar Cambios al Schema de Base de Datos

**Opción A: Migración (Recomendado)**
```powershell
cd c:\projects\node.js\ApexData
npx prisma migrate dev --name add_circuit_image_url
```

**Opción B: Push Directo (Más rápido)**
```powershell
cd c:\projects\node.js\ApexData
npx prisma db push
```

**Opción C: Regenerar Cliente (Si ya aplicaste el cambio)**
```powershell
cd c:\projects\node.js\ApexData
npx prisma generate
```

---

### 3. Ejecutar Scripts de Seeding

#### 3.1 Imágenes de Pilotos
```powershell
cd c:\projects\node.js\ApexData
npx tsx prisma/seed-driver-images.ts
```

**Resultado esperado:**
- ✅ Updated: ~20-30 pilotos
- ⏭️ Not found: algunos pilotos históricos

#### 3.2 Logos de Equipos

**Opción A: Usar Wikimedia Commons (URLs externas)**
```powershell
npx tsx prisma/seed-constructor-logos.ts --wikimedia
```

**Opción B: Usar archivos locales** (requiere descargar logos primero)
```powershell
npx tsx prisma/seed-constructor-logos.ts
```

**Resultado esperado:**
- ✅ Updated: ~10-15 equipos

#### 3.3 Imágenes de Circuitos
```powershell
npx tsx prisma/seed-circuit-images.ts
```

**Resultado esperado:**
- ✅ Updated: ~24-30 circuitos

---

### 4. Verificar Resultados

#### Opción A: Prisma Studio (Visual)
```powershell
npx prisma studio
```

Luego abre tu navegador en `http://localhost:5555` y verifica:
- Tabla `drivers` → campo `imageUrl` poblado
- Tabla `constructors` → campo `logoUrl` poblado
- Tabla `circuits` → campo `imageUrl` poblado

#### Opción B: Consulta SQL
```sql
-- Verificar pilotos con imágenes
SELECT "driverId", "givenName", "familyName", "imageUrl" 
FROM "drivers" 
WHERE "imageUrl" IS NOT NULL;

-- Verificar constructores con logos
SELECT "constructorId", "name", "logoUrl" 
FROM "constructors" 
WHERE "logoUrl" IS NOT NULL;

-- Verificar circuitos con imágenes
SELECT "circuitId", "name", "imageUrl" 
FROM "circuits" 
WHERE "imageUrl" IS NOT NULL;
```

---

### 5. Probar en la Aplicación

```powershell
npm run dev
```

Luego abre:
- **Pilotos:** http://localhost:3000/drivers
- **Equipos:** http://localhost:3000/constructors
- **Calendario:** http://localhost:3000/calendar

**Verificar:**
- ✅ Imágenes de pilotos se muestran
- ✅ Logos de equipos se muestran
- ✅ Fallbacks funcionan para datos sin imagen

---

## Troubleshooting

### Error: "Cannot find module 'tsx'"
```powershell
npm install -D tsx
```

### Error: "Cannot connect to database"
Verifica que tu `.env` tenga la `DATABASE_URL` correcta:
```
DATABASE_URL="postgresql://..."
```

### Error: "Driver/Constructor/Circuit not found"
Esto es normal para entidades que no existen en tu base de datos. Los scripts solo actualizan los que encuentran.

### Imágenes no se muestran en la app
1. Verifica que Prisma Client esté regenerado: `npx prisma generate`
2. Reinicia el servidor de desarrollo: `npm run dev`
3. Limpia caché del navegador (Ctrl + Shift + R)

---

## Notas Importantes

### Logos de Equipos - Opción Local
Si elegiste usar logos locales, necesitas:

1. Crear directorio:
```powershell
mkdir public\logos
```

2. Descargar logos SVG/PNG de:
   - Wikipedia
   - Wikimedia Commons
   - Sitios oficiales de equipos

3. Nombrar archivos según el script:
   - `red-bull.svg`
   - `mercedes.svg`
   - `ferrari.svg`
   - etc.

### URLs de Wikimedia Commons
Las URLs en los scripts son de Wikimedia Commons y son:
- ✅ Gratuitas y de uso libre
- ✅ Alta calidad
- ✅ Permanentes (no se borran)
- ⚠️ Requieren conexión a internet

---

## Próximos Pasos

Una vez completado Sprint 1:
- ✅ Todas las imágenes pobladas
- ✅ Base de datos actualizada
- ✅ Aplicación mostrando imágenes

**Siguiente:** Sprint 2 - Componentes y Mejoras Visuales
- CircuitImage component
- CountryFlag component
- TeamBackground component

---

**Última actualización:** 2025-12-28
