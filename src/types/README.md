# Types

Este directorio contiene definiciones de tipos TypeScript para el proyecto.

## Estructura

```
types/
├── api/              # Tipos de respuestas de APIs
│   ├── jolpica.ts    # Tipos de Jolpica API
│   └── openf1.ts     # Tipos de OpenF1 API
├── database.ts       # Tipos de base de datos (complementarios a Prisma)
├── common.ts         # Tipos compartidos
└── index.ts          # Re-exports
```

## Uso

```typescript
import type { JolpicaDriver, OpenF1Session } from '@/types';
```
