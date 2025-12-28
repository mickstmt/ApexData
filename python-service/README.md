# ApexData - Python Telemetry Service

Microservicio FastAPI para obtener datos de telemetría de F1 usando FastF1.

## Características

- ✅ Telemetría completa (Speed, RPM, Throttle, Brake, Gear, DRS)
- ✅ Lap times y análisis de vueltas
- ✅ Comparación entre pilotos
- ✅ Datos meteorológicos
- ✅ Información de sesiones y eventos
- ✅ Sistema de cache para optimizar requests
- ✅ Documentación automática con Swagger

## Requisitos

- Python 3.11+
- pip

## Instalación

### 1. Crear entorno virtual (recomendado)

```bash
cd python-service
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Configurar variables de entorno

```bash
copy .env.example .env
```

Edita el archivo `.env` según tus necesidades.

### 4. Ejecutar el servicio

```bash
# Desarrollo (con hot reload)
python run.py

# O usando uvicorn directamente
uvicorn app.main:app --reload --port 8000
```

El servicio estará disponible en: `http://localhost:8000`

## Documentación API

Una vez que el servicio esté corriendo, puedes acceder a:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Endpoints Principales

### Telemetría

#### Obtener telemetría de un piloto
```http
GET /api/telemetry/{year}/{event}/{session_type}/{driver}?lap={lap_number}
```

**Ejemplo:**
```bash
curl http://localhost:8000/api/telemetry/2024/Monaco/R/VER?lap=30
```

**Parámetros:**
- `year`: Año de la temporada (ej: 2024)
- `event`: Nombre del evento o número de ronda (ej: 'Monaco', '6')
- `session_type`: Tipo de sesión ('FP1', 'FP2', 'FP3', 'Q', 'S', 'R')
- `driver`: Código del piloto (ej: 'VER', 'HAM', 'LEC')
- `lap`: (Opcional) Número de vuelta. Si no se especifica, devuelve la vuelta más rápida

#### Comparar telemetría entre pilotos
```http
GET /api/telemetry/{year}/{event}/{session_type}/compare?driver1={code1}&driver2={code2}
```

**Ejemplo:**
```bash
curl "http://localhost:8000/api/telemetry/2024/Monaco/R/compare?driver1=VER&driver2=HAM"
```

### Lap Times

#### Obtener todas las vueltas de una sesión
```http
GET /api/laps/{year}/{event}/{session_type}?driver={driver_code}
```

**Ejemplo:**
```bash
curl http://localhost:8000/api/laps/2024/Monaco/R?driver=VER
```

#### Obtener las vueltas más rápidas
```http
GET /api/laps/{year}/{event}/{session_type}/fastest?limit={N}
```

**Ejemplo:**
```bash
curl http://localhost:8000/api/laps/2024/Monaco/Q/fastest?limit=10
```

#### Análisis detallado de un piloto
```http
GET /api/laps/{year}/{event}/{session_type}/driver/{driver}/analysis
```

**Ejemplo:**
```bash
curl http://localhost:8000/api/laps/2024/Monaco/R/driver/VER/analysis
```

### Weather

#### Obtener datos meteorológicos de una sesión
```http
GET /api/weather/{year}/{event}/{session_type}
```

**Ejemplo:**
```bash
curl http://localhost:8000/api/weather/2024/Monaco/R
```

### Sesiones y Eventos

#### Obtener calendario de la temporada
```http
GET /api/sessions/{year}
```

**Ejemplo:**
```bash
curl http://localhost:8000/api/sessions/2024
```

#### Obtener información de un evento
```http
GET /api/sessions/{year}/{event}
```

**Ejemplo:**
```bash
curl http://localhost:8000/api/sessions/2024/Monaco
```

#### Obtener información de una sesión
```http
GET /api/sessions/{year}/{event}/{session_type}/info
```

**Ejemplo:**
```bash
curl http://localhost:8000/api/sessions/2024/Monaco/R/info
```

## Tipos de Sesión

- `FP1` - Free Practice 1
- `FP2` - Free Practice 2
- `FP3` - Free Practice 3
- `Q` - Qualifying
- `S` - Sprint
- `R` - Race

## Códigos de Pilotos Comunes (2024)

- `VER` - Max Verstappen
- `PER` - Sergio Pérez
- `HAM` - Lewis Hamilton
- `RUS` - George Russell
- `LEC` - Charles Leclerc
- `SAI` - Carlos Sainz
- `NOR` - Lando Norris
- `PIA` - Oscar Piastri
- `ALO` - Fernando Alonso
- `STR` - Lance Stroll

## Cache

El servicio implementa un sistema de cache en disco para optimizar las requests repetidas.

- Los datos se cachean automáticamente
- TTL por defecto: 1 hora (configurable en `.env`)
- El cache se guarda en la carpeta `./cache`

## Docker

### Construir imagen

```bash
docker build -t apexdata-telemetry .
```

### Ejecutar contenedor

```bash
docker run -p 8000:8000 -v $(pwd)/cache:/app/cache apexdata-telemetry
```

## Integración con Next.js

### Ejemplo de uso en API Route de Next.js

```typescript
// app/api/telemetry/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const event = searchParams.get('event');
  const driver = searchParams.get('driver');

  const response = await fetch(
    `http://localhost:8000/api/telemetry/${year}/${event}/R/${driver}`
  );

  const data = await response.json();
  return Response.json(data);
}
```

### Ejemplo desde el frontend

```typescript
// En un componente de React
const getTelemetry = async (year: number, event: string, driver: string) => {
  const response = await fetch(
    `/api/telemetry?year=${year}&event=${event}&driver=${driver}`
  );
  return response.json();
};
```

## Estructura del Proyecto

```
python-service/
├── app/
│   ├── routes/           # Endpoints de la API
│   │   ├── telemetry.py  # Endpoints de telemetría
│   │   ├── laps.py       # Endpoints de vueltas
│   │   ├── weather.py    # Endpoints de clima
│   │   └── sessions.py   # Endpoints de sesiones
│   ├── services/         # Lógica de negocio
│   │   └── f1_service.py
│   ├── utils/            # Utilidades
│   │   └── cache_manager.py
│   ├── config.py         # Configuración
│   └── main.py           # Aplicación principal
├── cache/                # Directorio de cache
├── Dockerfile            # Docker configuration
├── requirements.txt      # Dependencias Python
├── run.py               # Script de inicio
└── README.md            # Esta documentación
```

## Troubleshooting

### Error: "No data available for this session"

FastF1 tiene datos completos desde 2018 en adelante. Para años anteriores, algunos datos pueden no estar disponibles.

### Error: Cache permissions

Asegúrate de que la carpeta `cache/` tenga permisos de escritura:

```bash
mkdir -p cache/fastf1
chmod -R 755 cache
```

### Request muy lento en la primera llamada

La primera vez que se solicitan datos de una sesión, FastF1 los descarga y cachea. Las siguientes requests serán mucho más rápidas.

## Recursos

- [FastF1 Documentation](https://docs.fastf1.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [F1 API Data Sources](https://jolpi.ca/ergast/f1/)

## Próximos Pasos

Para integrar este servicio con tu aplicación Next.js, revisa el documento [PLAN_ESCALAMIENTO.md](../PLAN_ESCALAMIENTO.md) en la raíz del proyecto.

## Licencia

MIT
