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

# Create FastAPI app
app = FastAPI(
    title="ApexData F1 Telemetry Service",
    description="Microservice for F1 telemetry data using FastF1",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
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
