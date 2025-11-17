# Services

Este directorio contiene servicios para integración con APIs externas y lógica de negocio.

## Estructura

```
services/
├── jolpica/          # Servicio para Jolpica F1 API
│   ├── drivers.ts    # Operaciones de pilotos
│   ├── teams.ts      # Operaciones de equipos
│   ├── races.ts      # Operaciones de carreras
│   └── index.ts      # Exports
├── openf1/           # Servicio para OpenF1 API
│   ├── telemetry.ts  # Datos de telemetría
│   ├── live.ts       # Datos en vivo
│   └── index.ts
└── cache/            # Servicios de caché
    └── redis.ts      # Cliente Redis (opcional)
```

## Uso

```typescript
import { jolpica } from '@/services/jolpica';

const drivers = await jolpica.getDrivers({ year: 2024 });
```
