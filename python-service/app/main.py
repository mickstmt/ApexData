"""
FastAPI application for F1 telemetry data service
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import telemetry, laps, weather, sessions
import fastf1

# Configure FastF1 cache
fastf1.Cache.enable_cache(settings.FASTF1_CACHE_DIR)

# The interactive docs are useful while developing but describe the whole
# surface of a service that will be reachable from the internet, so they are
# only mounted outside production.
_is_production = settings.ENVIRONMENT == "production"

app = FastAPI(
    title="ApexData F1 Telemetry Service",
    description="Microservice for F1 telemetry data using FastF1",
    version="1.0.0",
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
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
