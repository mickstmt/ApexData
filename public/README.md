# Public Images Directory

Este directorio contiene las imágenes locales para la aplicación ApexData.

## Estructura

```
public/
├── drivers/      # Fotos de pilotos F1
├── logos/        # Logos de equipos
└── circuits/     # Mapas de circuitos
```

## Instrucciones

### 1. Descargar Imágenes

Consulta `NOMBRES_ARCHIVOS_IMAGENES.md` en la raíz del proyecto para ver la lista completa de nombres de archivo requeridos.

### 2. Colocar Archivos

Coloca las imágenes descargadas en las carpetas correspondientes:

- **Pilotos:** `public/drivers/max_verstappen.jpg`
- **Logos:** `public/logos/red-bull.svg`
- **Circuitos:** `public/circuits/monaco.svg`

### 3. Ejecutar Seeding

```bash
npx tsx prisma/seed-local-images.ts
```

## Formatos Aceptados

- **Pilotos:** `.jpg`, `.jpeg`, `.png`, `.webp`
- **Logos:** `.svg`, `.png` (preferiblemente SVG con fondo transparente)
- **Circuitos:** `.svg`, `.png` (preferiblemente SVG)

## Tamaños Recomendados

- **Pilotos:** 400x400px (cuadrado)
- **Logos:** 200x200px
- **Circuitos:** 800x600px

## Ejemplo de Nombres

```
public/drivers/max_verstappen.jpg
public/drivers/hamilton.jpg
public/drivers/leclerc.jpg

public/logos/red-bull.svg
public/logos/mercedes.svg
public/logos/ferrari.svg

public/circuits/monaco.svg
public/circuits/silverstone.svg
public/circuits/monza.svg
```

## Notas

- Los nombres de archivo DEBEN coincidir con los IDs en la base de datos
- Usa minúsculas y guiones bajos (no espacios)
- Para logos, puedes usar guiones en lugar de guiones bajos (ej: `red-bull.svg`)
- Si falta un archivo, la UI mostrará un fallback placeholder

## Verificar Archivos

```powershell
# Windows PowerShell
Get-ChildItem public\drivers
Get-ChildItem public\logos
Get-ChildItem public\circuits
```

```bash
# Linux/Mac
ls public/drivers
ls public/logos
ls public/circuits
```
