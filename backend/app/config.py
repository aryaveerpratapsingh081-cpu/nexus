import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NEXUS_")
    
    APP_NAME: str = "Nexus AI OS"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Network binding - bind strictly to localhost for safety
    HOST: str = "127.0.0.1"
    PORT: int = 8005
    
    # Base directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    DATABASE_PATH: Path = DATA_DIR / "nexus.db"
    
    # Ollama settings
    OLLAMA_HOST: str = "http://127.0.0.1:11434"
    DEFAULT_MODEL: str = "qwen3:4b"
    OLLAMA_TIMEOUT_SECONDS: float = 60.0
    
    # Security limits
    MAX_FILE_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB max file read
    MAX_TEXT_EXTRACT_CHARS: int = 50000  # Cap extracted text to avoid overwhelming context
    MAX_SEARCH_RESULTS: int = 100
    
    # Default allowed directories
    # Will be initialized in database if empty
    USER_HOME: Path = Path.home()

settings = Settings()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
