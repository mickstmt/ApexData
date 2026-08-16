# Guía de Nombres de Archivos para Imágenes Locales

## Estructura de Carpetas Creada

```
public/
├── drivers/      ← Fotos de pilotos
├── logos/        ← Logos de equipos
└── circuits/     ← Mapas de circuitos
```

---

## 📸 FOTOS DE PILOTOS

### Ubicación: `public/drivers/`

### Formato Recomendado
- **Extensión:** `.jpg` o `.png`
- **Tamaño:** 400x400px mínimo (cuadrado preferiblemente)
- **Peso:** < 200KB por imagen

### Nombres de Archivo Requeridos

#### Pilotos 2024-2025 (Activos)

```
max_verstappen.jpg          # Max Verstappen (Red Bull)
perez.jpg                   # Sergio Pérez (Red Bull)
hamilton.jpg                # Lewis Hamilton (Mercedes)
russell.jpg                 # George Russell (Mercedes)
leclerc.jpg                 # Charles Leclerc (Ferrari)
sainz.jpg                   # Carlos Sainz (Ferrari)
norris.jpg                  # Lando Norris (McLaren)
piastri.jpg                 # Oscar Piastri (McLaren)
alonso.jpg                  # Fernando Alonso (Aston Martin)
stroll.jpg                  # Lance Stroll (Aston Martin)
ocon.jpg                    # Esteban Ocon (Alpine)
gasly.jpg                   # Pierre Gasly (Alpine)
tsunoda.jpg                 # Yuki Tsunoda (RB)
ricciardo.jpg               # Daniel Ricciardo (RB)
hulkenberg.jpg              # Nico Hülkenberg (Haas)
kevin_magnussen.jpg         # Kevin Magnussen (Haas)
bottas.jpg                  # Valtteri Bottas (Kick Sauber)
zhou.jpg                    # Zhou Guanyu (Kick Sauber)
albon.jpg                   # Alexander Albon (Williams)
sargeant.jpg                # Logan Sargeant (Williams)
colapinto.jpg               # Franco Colapinto (Williams)
lawson.jpg                  # Liam Lawson (RB)
```

#### Pilotos Históricos (2020-2023)

```
vettel.jpg                  # Sebastian Vettel
raikkonen.jpg               # Kimi Räikkönen
latifi.jpg                  # Nicholas Latifi
mazepin.jpg                 # Nikita Mazepin
schumacher.jpg              # Mick Schumacher
giovinazzi.jpg              # Antonio Giovinazzi
de_vries.jpg                # Nyck de Vries
```

**Total:** ~29 archivos de pilotos

---

## 🏁 LOGOS DE EQUIPOS

### Ubicación: `public/logos/`

### Formato Recomendado
- **Extensión:** `.svg` (preferido) o `.png` con fondo transparente
- **Tamaño:** 200x200px mínimo
- **Peso:** < 50KB por logo

### Nombres de Archivo Requeridos

#### Equipos 2024-2025 (Activos)

```
red-bull.svg                # Oracle Red Bull Racing
mercedes.svg                # Mercedes-AMG Petronas F1 Team
ferrari.svg                 # Scuderia Ferrari HP
mclaren.svg                 # McLaren F1 Team
alpine.svg                  # BWT Alpine F1 Team
aston-martin.svg            # Aston Martin Aramco F1 Team
williams.svg                # Williams Racing
rb.svg                      # Visa Cash App RB F1 Team
sauber.svg                  # Stake F1 Team Kick Sauber
haas.svg                    # MoneyGram Haas F1 Team
```

#### Equipos Históricos (2020-2023)

```
alphatauri.svg              # Scuderia AlphaTauri
alfa-romeo.svg              # Alfa Romeo F1 Team
racing-point.svg            # Racing Point F1 Team
renault.svg                 # Renault F1 Team
```

**Total:** ~14 archivos de logos

---

## 🏎️ MAPAS DE CIRCUITOS

### Ubicación: `public/circuits/`

### Formato Recomendado
- **Extensión:** `.svg` (preferido) o `.png`
- **Tamaño:** 800x600px mínimo
- **Peso:** < 100KB por mapa

### Nombres de Archivo Requeridos

#### Circuitos 2024 (Calendario Actual)

```
bahrain.svg                 # Bahrain International Circuit
jeddah.svg                  # Jeddah Corniche Circuit
albert_park.svg             # Albert Park Circuit (Australia)
suzuka.svg                  # Suzuka International Racing Course
shanghai.svg                # Shanghai International Circuit
miami.svg                   # Miami International Autodrome
imola.svg                   # Autodromo Enzo e Dino Ferrari
monaco.svg                  # Circuit de Monaco
villeneuve.svg              # Circuit Gilles Villeneuve (Canada)
catalunya.svg               # Circuit de Barcelona-Catalunya
red_bull_ring.svg           # Red Bull Ring (Austria)
silverstone.svg             # Silverstone Circuit
hungaroring.svg             # Hungaroring
spa.svg                     # Circuit de Spa-Francorchamps
zandvoort.svg               # Circuit Zandvoort
monza.svg                   # Autodromo Nazionale di Monza
baku.svg                    # Baku City Circuit
marina_bay.svg              # Marina Bay Street Circuit (Singapore)
americas.svg                # Circuit of the Americas (Austin)
rodriguez.svg               # Autódromo Hermanos Rodríguez (Mexico)
interlagos.svg              # Autódromo José Carlos Pace (Brazil)
vegas.svg                   # Las Vegas Strip Circuit
losail.svg                  # Losail International Circuit (Qatar)
yas_marina.svg              # Yas Marina Circuit (Abu Dhabi)
```

#### Circuitos Históricos

```
nurburgring.svg             # Nürburgring
hockenheimring.svg          # Hockenheimring
istanbul.svg                # Istanbul Park
portimao.svg                # Algarve International Circuit
mugello.svg                 # Mugello Circuit
sochi.svg                   # Sochi Autodrom
```

**Total:** ~30 archivos de circuitos

---

## 📋 RESUMEN DE ARCHIVOS NECESARIOS

| Categoría | Cantidad | Ubicación | Formato |
|-----------|----------|-----------|---------|
| Pilotos | ~29 | `public/drivers/` | JPG/PNG |
| Logos | ~14 | `public/logos/` | SVG/PNG |
| Circuitos | ~30 | `public/circuits/` | SVG/PNG |
| **TOTAL** | **~73** | | |

---

## 🔧 SCRIPT DE SEEDING

Una vez que tengas las imágenes descargadas con estos nombres exactos, ejecuta:

```powershell
# Poblar URLs de imágenes locales
npx tsx prisma/seed-local-images.ts
```

Este script:
1. Verifica que los archivos existan
2. Actualiza la base de datos con rutas locales (`/drivers/max_verstappen.jpg`)
3. Reporta archivos faltantes

---

## 💡 CONSEJOS

### Dónde Descargar

**Pilotos:**
- Sitios oficiales de equipos (mejor calidad)
- Formula1.com (fotos oficiales)
- Getty Images (requiere licencia)

**Logos:**
- Wikipedia (SVG de alta calidad)
- Sitios oficiales de equipos
- Brandfetch.com

**Circuitos:**
- Wikipedia (mapas oficiales)
- FIA.com
- Sitios oficiales de circuitos

### Optimización

Después de descargar, optimiza las imágenes:

```powershell
# Instalar herramienta de optimización (opcional)
npm install -g sharp-cli

# Optimizar todas las imágenes de pilotos
sharp -i "public/drivers/*.jpg" -o "public/drivers/" --webp
```

### Verificar Archivos

Lista archivos descargados:

```powershell
# Ver pilotos
Get-ChildItem public\drivers

# Ver logos
Get-ChildItem public\logos

# Ver circuitos
Get-ChildItem public\circuits
```

---

## ⚠️ IMPORTANTE

### Nombres Exactos
Los nombres de archivo DEBEN coincidir exactamente con los listados arriba (incluyendo guiones bajos y minúsculas).

### Extensiones Flexibles
El script acepta:
- `.jpg`, `.jpeg`, `.png` para pilotos
- `.svg`, `.png` para logos y circuitos

### Archivos Faltantes
Si faltan archivos, el script:
- ✅ Actualizará los que encuentre
- ⏭️ Saltará los que no existan
- 📊 Reportará estadísticas al final

---

## 📝 CHECKLIST

### Antes de Ejecutar el Script

- [ ] Carpetas creadas (`public/drivers/`, `public/logos/`, `public/circuits/`)
- [ ] Imágenes de pilotos descargadas y renombradas
- [ ] Logos de equipos descargados y renombrados
- [ ] Mapas de circuitos descargados y renombrados
- [ ] Nombres de archivo verificados (sin espacios, minúsculas)
- [ ] Ejecutar `npx tsx prisma/seed-local-images.ts`

---

**Última actualización:** 2025-12-28
