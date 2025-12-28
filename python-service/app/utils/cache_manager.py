"""
Cache manager for API responses
Uses diskcache for persistent caching
"""
import diskcache as dc
from app.config import settings
import hashlib
import json


class CacheManager:
    """Simple cache manager using diskcache"""

    def __init__(self):
        if settings.CACHE_ENABLED:
            self.cache = dc.Cache(settings.CACHE_DIR)
        else:
            self.cache = None

    def _generate_key(self, key: str) -> str:
        """Generate cache key hash"""
        return hashlib.md5(key.encode()).hexdigest()

    def get(self, key: str):
        """Get value from cache"""
        if not settings.CACHE_ENABLED or self.cache is None:
            return None

        cache_key = self._generate_key(key)
        return self.cache.get(cache_key)

    def set(self, key: str, value: any, ttl: int = None):
        """Set value in cache with TTL"""
        if not settings.CACHE_ENABLED or self.cache is None:
            return

        cache_key = self._generate_key(key)
        expire_time = ttl if ttl is not None else settings.CACHE_TTL

        self.cache.set(cache_key, value, expire=expire_time)

    def delete(self, key: str):
        """Delete value from cache"""
        if not settings.CACHE_ENABLED or self.cache is None:
            return

        cache_key = self._generate_key(key)
        self.cache.delete(cache_key)

    def clear(self):
        """Clear all cache"""
        if settings.CACHE_ENABLED and self.cache is not None:
            self.cache.clear()

    def stats(self):
        """Get cache statistics"""
        if not settings.CACHE_ENABLED or self.cache is None:
            return {"enabled": False}

        return {
            "enabled": True,
            "size": len(self.cache),
            "volume": self.cache.volume(),
        }


# Global cache manager instance
cache_manager = CacheManager()
