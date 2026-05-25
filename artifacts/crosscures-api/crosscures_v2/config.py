from pydantic_settings import BaseSettings
from functools import lru_cache


def _default_db_url() -> str:
    import os
    url = os.environ.get("DATABASE_URL", "sqlite:///./crosscures.db")
    # SQLAlchemy 2.x requires postgresql:// not postgres://
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


class Settings(BaseSettings):
    database_url: str = _default_db_url()
    secret_key: str = "crosscures-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    anthropic_api_key: str = ""
    cartesia_api_key: str = ""
    cartesia_version: str = "2026-03-01"
    cartesia_tts_model: str = "sonic-3"
    cartesia_stt_model: str = "ink-whisper"
    cartesia_voice_id: str = "694f9389-aac1-45b6-b726-9d9369183238"

    frontend_url: str = "http://localhost:3000"
    consent_version: str = "1.0.0"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
