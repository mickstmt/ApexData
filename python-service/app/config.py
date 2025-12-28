"""
Configuration settings for the FastF1 microservice
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""

    # Server
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    RELOAD: bool = True

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    # Cache
    CACHE_DIR: str = "./cache"
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 3600  # 1 hour

    # FastF1
    FASTF1_CACHE_DIR: str = "./cache/fastf1"

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS_ORIGINS string to list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()
