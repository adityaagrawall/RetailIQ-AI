from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import os


class Settings(BaseSettings):
    # Application
    app_name: str = "RetailIQ AI"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = False

    # Database
    database_url: str

    # Security
    secret_key: str = "dev-secret-key-change-in-production"

    # File Upload
    max_upload_size_mb: int = 100
    allowed_extensions: List[str] = [".csv", ".xlsx"]
    upload_temp_dir: str = "./uploads_temp"

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    # AI
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"
    ai_cache_ttl_hours: int = 24

    # ML
    ml_artifacts_dir: str = "./ml_artifacts"
    forecast_horizon_days: int = 30
    default_lead_time_days: int = 7
    safety_stock_z_score: float = 1.65  # 95% service level

    # Logging
    log_level: str = "INFO"

    # Rate Limiting
    rate_limit_upload: str = "5/hour"
    rate_limit_ai: str = "30/hour"
    rate_limit_general: str = "200/minute"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()

# Ensure directories exist
os.makedirs(settings.upload_temp_dir, exist_ok=True)
os.makedirs(settings.ml_artifacts_dir, exist_ok=True)
