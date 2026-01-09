"""
Configuration Management
Loads and validates environment variables
"""

import os
import sys
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator


class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    groq_api_key: str = Field(..., env="GROQ_API_KEY")
    port: int = Field(default=8000, env="PORT")
    host: str = Field(default="0.0.0.0", env="HOST")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # File Upload
    max_file_size: int = 20 * 1024 * 1024  # 20MB
    allowed_extensions: list = ['.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.jpg', '.jpeg', '.png']
    
    # RAG Configuration
    chunk_size: int = 1000
    chunk_overlap: int = 200
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    llm_model: str = "llama-3.1-70b-versatile"
    vision_model: str = "llama-3.2-90b-vision-preview"
    
    @validator('groq_api_key')
    def validate_api_key(cls, v):
        if not v or v == "your_groq_api_key_here":
            raise ValueError(
                "GROQ_API_KEY not set! Please configure it in .env file.\n"
                "Get your key at: https://console.groq.com"
            )
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


def load_settings() -> Settings:
    """Load and validate settings"""
    try:
        # Try to load from .env file
        from dotenv import load_dotenv
        
        # Find .env file
        env_path = Path(__file__).parent.parent / '.env'
        if env_path.exists():
            load_dotenv(dotenv_path=env_path)
        
        return Settings()
    except Exception as e:
        print(f"\n❌ Configuration Error: {e}")
        print("\n📝 Setup Instructions:")
        print("1. Copy .env.example to .env")
        print("2. Add your GROQ_API_KEY")
        print("3. Get API key from: https://console.groq.com")
        sys.exit(1)


# Global settings instance
settings = load_settings()
