from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "StudyGPT Backend"
    API_V1_STR: str = "/api"
    
    # Supabase Configuration
    SUPABASE_URL: str = Field(default="", env="SUPABASE_URL")
    SUPABASE_KEY: str = Field(default="", env="SUPABASE_KEY")
    SUPABASE_JWT_SECRET: str = Field(default="", env="SUPABASE_JWT_SECRET")
    
    # Gemini Configuration
    GEMINI_API_KEY: str = Field(default="", env="GEMINI_API_KEY")
    
    # Database Configuration (Supabase Postgres connection string)
    DATABASE_URL: str = Field(default="", env="DATABASE_URL")
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
