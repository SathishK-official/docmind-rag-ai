"""
API Routes
All API endpoints for the application
"""

import os
import sys
import uuid
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse

from app.config import settings
from app.api.models import (
    UploadResponse, QueryRequest, QueryResponse,
    TTSRequest, StatusResponse
)
from app.services.document_processor import DocumentProcessor
from app.services.image_processor import ImageProcessor
from app.services.rag_engine import RAGEngine
from app.services.voice_handler import VoiceHandler


# Create router
router = APIRouter(prefix="/api/v1", tags=["API"])

# Initialize services (lazy loading)
_doc_processor = None
_img_processor = None
_voice_handler = None

# Session storage (in-memory)
sessions = {}


def get_doc_processor():
    global _doc_processor
    if _doc_processor is None:
        _doc_processor = DocumentProcessor()
    return _doc_processor


def get_img_processor():
    global _img_processor
    if _img_processor is None:
        _img_processor = ImageProcessor()
    return _img_processor


def get_voice_handler():
    global _voice_handler
    if _voice_handler is None:
        _voice_handler = VoiceHandler()
    return _voice_handler


def get_temp_dir(session_id: str) -> str:
    """Get platform-specific temp directory"""
    if sys.platform == 'win32':
        temp_base = os.path.join(os.environ.get('TEMP', 'C:\\Temp'), 'volcanorag')
    else:
        temp_base = "/tmp/volcanorag"
    
    temp_dir = os.path.join(temp_base, session_id)
    os.makedirs(temp_dir, exist_ok=True)
    return temp_dir


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and process a document
    
    - Validates file type and size
    - Extracts text and images
    - Runs OCR and Vision AI
    - Creates vector embeddings
    - Returns session ID for queries
    """
    try:
        # Read file content
        content = await file.read()
        
        # Validate file size
        if len(content) > settings.max_file_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large (max {settings.max_file_size // (1024*1024)}MB)"
            )
        
        # Validate file type
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in settings.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_ext}"
            )
        
        # Create session
        session_id = str(uuid.uuid4())
        temp_dir = get_temp_dir(session_id)
        
        # Save file
        file_path = os.path.join(temp_dir, file.filename)
        with open(file_path, "wb") as f:
            f.write(content)
        
        print(f"📄 Processing: {file.filename}")
        
        # Process document
        doc_processor = get_doc_processor()
        extracted_text, images = doc_processor.process_document(file_path)
        
        # Process images
        ocr_text = ""
        vision_descriptions = []
        
        if images:
            print(f"🖼️  Processing {len(images)} images...")
            img_processor = get_img_processor()
            
            for i, img_path in enumerate(images):
                # OCR
                ocr_result = img_processor.extract_text_ocr(img_path)
                if ocr_result:
                    ocr_text += f"\n\n--- Image {i+1} OCR ---\n{ocr_result}"
                
                # Vision AI
                vision_result = img_processor.analyze_image_vision(img_path)
                if vision_result:
                    vision_descriptions.append(f"Image {i+1}: {vision_result}")
        
        # Combine all text
        combined_text = extracted_text
        if ocr_text:
            combined_text += "\n\n=== OCR TEXT ===\n" + ocr_text
        if vision_descriptions:
            combined_text += "\n\n=== VISION AI ===\n" + "\n".join(vision_descriptions)
        
        # Create RAG engine
        print("🔥 Creating vector store...")
        rag_engine = RAGEngine()
        rag_engine.create_vector_store(combined_text)
        
        # Store session
        sessions[session_id] = {
            "rag_engine": rag_engine,
            "filename": file.filename,
            "temp_dir": temp_dir,
            "text_length": len(combined_text),
            "num_images": len(images) if images else 0
        }
        
        print(f"✓ Session created: {session_id}")
        
        return {
            "session_id": session_id,
            "filename": file.filename,
            "status": "ready",
            "text_length": len(combined_text),
            "num_chunks": len(rag_engine.texts),
            "num_images_processed": len(images) if images else 0,
            "message": "Document processed successfully!"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query", response_model=QueryResponse)
async def query_document(request: QueryRequest):
    """
    Query a processed document
    
    - Requires valid session ID
    - Performs semantic search
    - Generates AI response
    """
    try:
        # Validate session
        if request.session_id not in sessions:
            raise HTTPException(
                status_code=404,
                detail="Session not found. Please upload a document first."
            )
        
        session = sessions[request.session_id]
        rag_engine = session["rag_engine"]
        
        print(f"🔍 Query: {request.question}")
        
        # Get answer
        answer = rag_engine.query(request.question, language=request.language)
        
        return {
            "answer": answer,
            "session_id": request.session_id,
            "question": request.question
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech
    
    - Supports English and Tanglish
    - Returns audio stream
    """
    try:
        voice_handler = get_voice_handler()
        audio_stream = await voice_handler.text_to_speech(
            request.text,
            request.language
        )
        return StreamingResponse(audio_stream, media_type="audio/mpeg")
    except Exception as e:
        print(f"❌ TTS Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{session_id}", response_model=StatusResponse)
async def get_status(session_id: str):
    """Get session status"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    return {
        "session_id": session_id,
        "filename": session["filename"],
        "text_length": session["text_length"],
        "num_images": session["num_images"],
        "status": "active"
    }


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete session and cleanup"""
    if session_id in sessions:
        session = sessions[session_id]
        
        # Cleanup temp directory
        if os.path.exists(session["temp_dir"]):
            shutil.rmtree(session["temp_dir"])
        
        del sessions[session_id]
        return {"status": "deleted", "session_id": session_id}
    
    raise HTTPException(status_code=404, detail="Session not found")
