# Hooks

Este directorio contiene React hooks personalizados.

## Estructura

```
hooks/
├── useDrivers.ts     # Hook para obtener pilotos
├── useRaces.ts       # Hook para obtener carreras
├── useStandings.ts   # Hook para clasificaciones
└── index.ts          # Re-exports
```

## Uso

```typescript
import { useDrivers } from '@/hooks';

function DriversPage() {
  const { drivers, isLoading } = useDrivers();

  if (isLoading) return <Loading />;

  return <DriversList drivers={drivers} />;
}
```
