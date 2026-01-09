"""
VolcanoRAG FastAPI Application
Main entry point for the backend server
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.config import settings
from app.api.routes import router
from app.api.models import HealthResponse


# Create FastAPI app
app = FastAPI(
    title="VolcanoRAG API",
    description="AI Document Assistant with RAG, OCR, and Vision AI",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


@app.get("/", response_model=HealthResponse, tags=["Health"])
async def root():
    """Health check endpoint"""
    return {
        "status": "active",
        "service": "VolcanoRAG API",
        "version": "2.0.0",
        "docs": "/docs"
    }


@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    print("\n" + "="*60)
    print("🌋 VolcanoRAG API v2.0.0")
    print("="*60)
    print(f"✓ API Key configured: {settings.groq_api_key[:20]}...")
    print(f"✓ Server: http://{settings.host}:{settings.port}")
    print(f"✓ Docs: http://{settings.host}:{settings.port}/docs")
    print("="*60 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    print("\n🌋 VolcanoRAG API shutting down...")


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower()
    )
