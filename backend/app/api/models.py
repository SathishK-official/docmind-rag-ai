"""
Pydantic models for API requests and responses
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str
    docs: str


class UploadResponse(BaseModel):
    """Document upload response"""
    session_id: str
    filename: str
    status: str
    text_length: int
    num_chunks: int
    num_images_processed: int
    message: str


class QueryRequest(BaseModel):
    """Query request"""
    session_id: str = Field(..., description="Session ID from upload")
    question: str = Field(..., min_length=1, description="Question to ask")
    language: str = Field(default="en", description="Response language (en/ta)")


class QueryResponse(BaseModel):
    """Query response"""
    answer: str
    session_id: str
    question: str


class TTSRequest(BaseModel):
    """Text-to-speech request"""
    text: str = Field(..., min_length=1, description="Text to convert")
    language: str = Field(default="en", description="Voice language (en/ta)")


class StatusResponse(BaseModel):
    """Session status response"""
    session_id: str
    filename: str
    text_length: int
    num_images: int
    status: str
