"""
FastAPI application for F1 telemetry data service
"""
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import telemetry, laps, weather, sessions
import fastf1

# Configure FastF1 cache
fastf1.Cache.enable_cache(settings.FASTF1_CACHE_DIR)

_arranque_logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def _ciclo_de_vida(app: FastAPI):
    # La huella del despliegue. El panel enseña el registro pero no dice cuándo
    # arrancó cada versión, y sin esta línea no hay forma de saber si un Deploy
    # entró de verdad o se está mirando un contenedor de hace tres días.
    ahora = datetime.now(timezone.utc)
    lima = ahora.astimezone(timezone(timedelta(hours=-5)))
    _arranque_logger.info(
        "ApexData Telemetry v%s desplegado y arrancado: %s UTC (%s hora de Lima)",
        app.version,
        ahora.strftime("%Y-%m-%d %H:%M:%S"),
        lima.strftime("%Y-%m-%d %H:%M:%S"),
    )
    yield

# The interactive docs are useful while developing but describe the whole
# surface of a service that will be reachable from the internet, so they are
# only mounted outside production.
_is_production = settings.ENVIRONMENT == "production"

app = FastAPI(
    title="ApexData F1 Telemetry Service",
    description="Microservice for F1 telemetry data using FastF1",
    # La versión sale en la huella de arranque, así que decir siempre «1.0.0»
    # la deja a medias: dice CUÁNDO arrancó pero no QUÉ arrancó. Se sube a mano
    # con cada cambio del servicio, que son pocos y espaciados.
    version="1.1.0",
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
    lifespan=_ciclo_de_vida,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    # The service holds no cookies or sessions, so credentials are not needed
    # and allowing them would only widen what a browser will send.
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Include routers
app.include_router(telemetry.router, prefix="/api/telemetry", tags=["Telemetry"])
app.include_router(laps.router, prefix="/api/laps", tags=["Laps"])
app.include_router(weather.router, prefix="/api/weather", tags=["Weather"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "ApexData F1 Telemetry Service",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "cache_enabled": settings.CACHE_ENABLED,
        "cache_dir": settings.FASTF1_CACHE_DIR,
    }
