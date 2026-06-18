from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str = ""
    tavily_api_key: str = ""
    google_places_api_key: str = ""
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:5173"
    groq_model: str = "llama-3.3-70b-versatile"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
