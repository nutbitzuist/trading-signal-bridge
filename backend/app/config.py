"""
Application configuration using Pydantic Settings.
"""
from functools import lru_cache
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "Trading Signal Bridge"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-this-in-production-to-a-secure-random-key"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/signal_bridge"
    DATABASE_ECHO: bool = False
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def convert_database_url(cls, v):
        """Convert postgresql:// to postgresql+asyncpg:// for async SQLAlchemy."""
        if isinstance(v, str) and v:
            # Railway provides postgresql:// but asyncpg needs postgresql+asyncpg://
            if v.startswith("postgresql://") and "+asyncpg" not in v:
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
            # Also handle postgres:// variant
            if v.startswith("postgres://") and "+asyncpg" not in v:
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_SIGNAL_EXPIRE_SECONDS: int = 60

    # JWT Authentication
    JWT_SECRET_KEY: str = "jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Security
    BCRYPT_ROUNDS: int = 12
    API_KEY_LENGTH: int = 64
    WEBHOOK_SECRET_LENGTH: int = 64
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # Rate Limiting
    WEBHOOK_RATE_LIMIT: int = 100  # per minute
    EA_POLL_RATE_LIMIT: int = 60   # per minute

    # Signal Settings
    SIGNAL_EXPIRY_SECONDS: int = 60
    MAX_PENDING_SIGNALS_PER_ACCOUNT: int = 50

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            # Skip empty strings
            if not v or not v.strip():
                return ["http://localhost:3000"]
            # Try comma-separated first (most common for env vars)
            if "," in v or not v.startswith("["):
                return [origin.strip() for origin in v.split(",") if origin.strip()]
            # Fall back to JSON parsing
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
