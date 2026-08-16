# Guía: Obtener Imágenes Reales de F1

## Problema

Las URLs de Wikimedia Commons que generé inicialmente no funcionan de manera confiable debido a:
- Cambios en nombres de archivos
- Restricciones de acceso (403/429 errors)
- Imágenes que no existen o fueron movidas

## Solución Implementada

He creado **scripts v2** que usan **placeholders temporales** mientras obtienes imágenes reales.

---

## Opción 1: Usar Placeholders (RECOMENDADO para empezar)

### Ventajas
✅ Funciona inmediatamente  
✅ No requiere descargas  
✅ Usa colores de equipos  
✅ Muestra iniciales de pilotos  

### Ejecutar

```powershell
# Pilotos - Placeholders con iniciales y colores de equipo
npx tsx prisma/seed-driver-images-v2.ts

# Equipos - Placeholders con colores oficiales
npx tsx prisma/seed-constructor-logos-v2.ts --placeholders
```

### Resultado
- Pilotos: Avatares con iniciales (ej: "MV" para Max Verstappen)
- Equipos: Avatares con iniciales del equipo en colores oficiales

---

## Opción 2: Imágenes Reales (Proceso manual)

### A. Fotos de Pilotos

#### Fuente 1: Sitios Oficiales de Equipos
Cada equipo tiene fotos oficiales de sus pilotos:

**Red Bull Racing**
- https://www.redbullracing.com/int-en/drivers
- Descargar fotos de Max Verstappen y Sergio Pérez

**Mercedes-AMG F1**
- https://www.mercedesamgf1.com/en/team/drivers/
- Descargar fotos de Lewis Hamilton y George Russell

**Ferrari**
- https://www.ferrari.com/en-EN/formula1/drivers
- Descargar fotos de Charles Leclerc y Carlos Sainz

**McLaren**
- https://www.mclaren.com/racing/team/drivers/
- Descargar fotos de Lando Norris y Oscar Piastri

... (repetir para todos los equipos)

#### Fuente 2: Formula1.com
- https://www.formula1.com/en/drivers.html
- Fotos oficiales de todos los pilotos
- Requiere inspeccionar elemento para obtener URLs

#### Fuente 3: Getty Images (Requiere licencia)
- https://www.gettyimages.com/
- Buscar "F1 driver portrait 2024"
- Requiere compra de licencia

#### Proceso Manual
1. Descargar imágenes (formato JPG o PNG)
2. Guardar en `public/drivers/` con nombre del driverId:
   ```
   public/drivers/max_verstappen.jpg
   public/drivers/hamilton.jpg
   public/drivers/leclerc.jpg
   ```
3. Actualizar base de datos con rutas locales:
   ```sql
   UPDATE drivers 
   SET "imageUrl" = '/drivers/max_verstappen.jpg' 
   WHERE "driverId" = 'max_verstappen';
   ```

### B. Logos de Equipos

#### Fuente 1: Wikipedia (Descarga manual)
1. Ir a https://en.wikipedia.org/wiki/[Team_Name]
2. Buscar el logo oficial
3. Clic derecho > "Save image as..."
4. Guardar en `public/logos/`

Ejemplo para Red Bull:
1. https://en.wikipedia.org/wiki/Red_Bull_Racing
2. Descargar logo SVG
3. Guardar como `public/logos/red-bull.svg`

#### Fuente 2: Sitios Oficiales de Equipos
Muchos equipos tienen media kits con logos descargables:
- Red Bull: https://www.redbullracing.com/int-en/media
- Mercedes: https://www.mercedesamgf1.com/en/media/
- Ferrari: https://www.ferrari.com/en-EN/formula1/media

#### Fuente 3: Brandfetch
- https://brandfetch.com/
- Buscar "Red Bull Racing", "Mercedes F1", etc.
- Descargar logos en alta calidad

#### Proceso Manual
1. Descargar logos (preferiblemente SVG o PNG transparente)
2. Guardar en `public/logos/`:
   ```
   public/logos/red-bull.svg
   public/logos/mercedes.svg
   public/logos/ferrari.svg
   ```
3. Actualizar base de datos:
   ```sql
   UPDATE constructors 
   SET "logoUrl" = '/logos/red-bull.svg' 
   WHERE "constructorId" = 'red_bull';
   ```

### C. Mapas de Circuitos

#### Fuente 1: Wikipedia Circuit Pages
Cada circuito tiene su página con mapa:
- Monaco: https://en.wikipedia.org/wiki/Circuit_de_Monaco
- Silverstone: https://en.wikipedia.org/wiki/Silverstone_Circuit
- Monza: https://en.wikipedia.org/wiki/Autodromo_Nazionale_di_Monza

#### Fuente 2: FIA Official
- https://www.fia.com/circuits
- Mapas oficiales de circuitos

#### Proceso Manual
1. Descargar mapas de circuitos (SVG o PNG)
2. Guardar en `public/circuits/`:
   ```
   public/circuits/monaco.svg
   public/circuits/silverstone.svg
   ```
3. Actualizar base de datos:
   ```sql
   UPDATE circuits 
   SET "imageUrl" = '/circuits/monaco.svg' 
   WHERE "circuitId" = 'monaco';
   ```

---

## Opción 3: Script Automatizado (Avanzado)

Si quieres automatizar la descarga, puedes crear un script que:

1. Scrape sitios oficiales
2. Descargue imágenes automáticamente
3. Optimice y guarde en `/public/`
4. Actualice la base de datos

**Nota:** Esto requiere:
- Verificar términos de uso de cada sitio
- Implementar rate limiting
- Manejo de errores robusto

---

## Configuración de Next.js para Imágenes Externas

Si decides usar URLs externas, actualiza `next.config.ts`:

```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'www.redbullracing.com',
      },
      {
        protocol: 'https',
        hostname: 'www.mercedesamgf1.com',
      },
      // ... agregar más dominios según necesites
    ],
  },
};
```

---

## Recomendación Final

### Para Desarrollo (Ahora)
✅ Usar **Opción 1: Placeholders**
- Rápido y funcional
- Permite continuar con desarrollo
- Fácil de reemplazar después

### Para Producción (Después)
✅ Usar **Opción 2: Imágenes Reales**
- Descargar y alojar localmente en `/public/`
- Mejor performance (no depende de servicios externos)
- Control total sobre las imágenes

---

## Comandos Rápidos

```powershell
# 1. Usar placeholders (RECOMENDADO para empezar)
npx tsx prisma/seed-driver-images-v2.ts
npx tsx prisma/seed-constructor-logos-v2.ts --placeholders

# 2. Verificar en Prisma Studio
npx prisma studio

# 3. Probar en la app
npm run dev
# Abrir http://localhost:3000/drivers
```

---

## Próximos Pasos

Una vez que tengas placeholders funcionando:
1. ✅ Continuar con Sprint 2 (componentes visuales)
2. ⏳ Ir reemplazando placeholders con imágenes reales gradualmente
3. ⏳ Optimizar imágenes para web (WebP, compresión)

---

**Última actualización:** 2025-12-28
