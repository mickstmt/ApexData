# 🎨 Guía de Tipografía - ApexData

## Tipografías Implementadas

### 🚀 Orbitron (Display/Títulos)
- **Uso**: Títulos, headings, números grandes, nombres de pilotos
- **Características**: Futurista, tecnológica, geométrica
- **Variable CSS**: `--font-orbitron`
- **Clase Tailwind**: `font-display`

### 📖 Inter (Cuerpo)
- **Uso**: Todo el texto de cuerpo, párrafos, descripciones
- **Características**: Legible, neutral, profesional
- **Variable CSS**: `--font-inter`
- **Clase Tailwind**: `font-sans` (por defecto)

### 💻 Roboto Mono (Monospace)
- **Uso**: Código, datos técnicos, tiempos
- **Características**: Monoespaciada, técnica
- **Variable CSS**: `--font-roboto-mono`
- **Clase Tailwind**: `font-mono`

---

## 📝 Ejemplos de Uso

### Uso Automático (Recomendado)

Todos los `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>` usan **Orbitron automáticamente**:

```tsx
<h1>Pilotos de Fórmula 1</h1>
// ✅ Usa Orbitron automáticamente

<p>Texto de cuerpo normal</p>
// ✅ Usa Inter por defecto
```

### Uso Manual con Clases

```tsx
// Forzar Orbitron en cualquier elemento
<div className="font-display text-4xl font-bold">
  Max Verstappen
</div>

// Forzar Inter (texto normal)
<div className="font-sans text-base">
  Descripción del piloto...
</div>

// Monospace para tiempos/datos
<div className="font-mono text-lg">
  1:23.456
</div>
```

### Ejemplos de Componentes

#### Título de Página
```tsx
<h1 className="text-5xl font-bold">
  Calendario <span className="text-primary">2024</span>
</h1>
// ✅ Orbitron automático, Inter en el cuerpo
```

#### Números Grandes (Stats)
```tsx
<div className="font-display text-6xl font-black text-primary">
  24
</div>
<div className="font-sans text-sm text-muted-foreground">
  Grandes Premios
</div>
```

#### Card de Piloto
```tsx
<div className="rounded-lg border bg-card p-6">
  <h3 className="text-2xl font-bold mb-2">
    Lewis Hamilton
  </h3>
  {/* ✅ Orbitron automático en h3 */}

  <p className="text-sm text-muted-foreground mb-4">
    7 veces campeón del mundo
  </p>
  {/* ✅ Inter automático en p */}

  <div className="font-mono text-lg text-primary">
    #44
  </div>
  {/* ✅ Roboto Mono para número de piloto */}
</div>
```

#### Tiempos de Vuelta
```tsx
<div className="space-y-2">
  <div className="font-display text-sm font-semibold text-muted-foreground">
    TIEMPO MÁS RÁPIDO
  </div>
  <div className="font-mono text-3xl font-bold text-primary">
    1:32.478
  </div>
</div>
```

---

## 🎯 Reglas de Uso

### ✅ USAR Orbitron para:
- Títulos principales (h1, h2, h3)
- Nombres de pilotos en destacados
- Números grandes de estadísticas
- Labels importantes (ej: "GANADOR", "POLE POSITION")
- Nombres de equipos en títulos
- Nombres de circuitos destacados

### ✅ USAR Inter para:
- Todo el texto de cuerpo
- Descripciones
- Párrafos
- Texto en botones
- Labels normales
- Navegación
- Formularios

### ✅ USAR Roboto Mono para:
- Tiempos de vuelta (1:23.456)
- Números de piloto (#44)
- Fechas en formato técnico (2024-03-15)
- Código o datos técnicos
- Velocidades (345 km/h)

---

## 🛠️ Clases Útiles de Tailwind

```tsx
// Orbitron
className="font-display"

// Inter (por defecto)
className="font-sans"

// Roboto Mono
className="font-mono"

// Combinar con pesos
className="font-display font-black"  // Orbitron extra bold
className="font-sans font-medium"   // Inter medium
className="font-mono font-bold"     // Roboto Mono bold

// Tamaños comunes para títulos con Orbitron
className="font-display text-5xl font-bold"     // Hero title
className="font-display text-3xl font-semibold" // Section title
className="font-display text-xl font-medium"    // Card title
```

---

## 💡 Tips de Diseño

1. **Letter Spacing**: Orbitron funciona mejor con `tracking-tight` o `tracking-tighter`
   ```tsx
   className="font-display text-5xl font-bold tracking-tighter"
   ```

2. **Contraste de Peso**: Usa bold (700) o black (900) con Orbitron para máximo impacto
   ```tsx
   className="font-display font-black text-7xl"
   ```

3. **Números Grandes**: Orbitron es perfecta para números de estadísticas
   ```tsx
   <div className="font-display text-6xl font-black text-primary">479</div>
   ```

4. **Uppercase**: Orbitron funciona excelente en uppercase para labels
   ```tsx
   <div className="font-display text-xs font-bold uppercase tracking-wider">
     Clasificación
   </div>
   ```

5. **Mezcla con Inter**: Usa spans para mezclar en un mismo texto
   ```tsx
   <h1 className="text-5xl font-bold">
     Temporada <span className="text-primary">2024</span>
   </h1>
   ```

---

## 🎨 Ejemplos Completos

### Hero Section
```tsx
<section className="py-20">
  <h1 className="mb-4 text-7xl font-black tracking-tighter">
    APEX<span className="text-primary">DATA</span>
  </h1>
  <p className="text-xl text-muted-foreground">
    La plataforma definitiva de datos de Fórmula 1
  </p>
</section>
```

### Stat Card
```tsx
<div className="rounded-lg border bg-card p-6">
  <div className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
    Total de Carreras
  </div>
  <div className="mb-1 font-display text-5xl font-black text-primary">
    24
  </div>
  <div className="text-sm text-muted-foreground">
    Temporada 2024
  </div>
</div>
```

### Race Result
```tsx
<div className="flex items-center justify-between">
  <div>
    <h3 className="text-xl font-bold">Max Verstappen</h3>
    <p className="text-sm text-muted-foreground">Red Bull Racing</p>
  </div>
  <div className="text-right">
    <div className="font-display text-3xl font-bold text-primary">1</div>
    <div className="font-mono text-sm text-muted-foreground">1:32.478</div>
  </div>
</div>
```

---

## 🔧 Troubleshooting

### Si Orbitron no se aplica:
1. Verifica que el componente use `<h1>` a `<h6>`
2. O usa la clase manual: `className="font-display"`
3. Asegúrate de que Next.js haya compilado los cambios

### Si quieres desactivar Orbitron en un título específico:
```tsx
<h1 className="font-sans text-5xl font-bold">
  Este título usa Inter en vez de Orbitron
</h1>
```

---

## 📚 Referencias

- [Orbitron en Google Fonts](https://fonts.google.com/specimen/Orbitron)
- [Inter en Google Fonts](https://fonts.google.com/specimen/Inter)
- [Roboto Mono en Google Fonts](https://fonts.google.com/specimen/Roboto+Mono)
