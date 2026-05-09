from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    app_host: str = "0.0.0.0"
    app_port: int = 8000
    frontend_url: str = "http://localhost:3000"

    database_url: str = "sqlite+aiosqlite:///./shanai.db"

    upload_dir: Path = Path(__file__).parent.parent / "uploads"
    chroma_dir: Path = Path(__file__).parent.parent / "chroma_data"

    chunk_size: int = 400
    chunk_overlap: int = 80
    max_search_results: int = 5

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.chroma_dir.mkdir(parents=True, exist_ok=True)
