import os
import shutil
import tempfile
from datetime import datetime
from typing import List, Optional
import logging

import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from services.document_service import DocumentService
from services.chat_service import ChatService
from services.embedding_service import EmbeddingService
from database.database import init_db, get_db
from models.models import Document, Chat, Message

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="DOCUMIND API",
    description="AI-powered document interaction platform",
    version="1.0.0",
)

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
document_service = DocumentService()
chat_service = ChatService()
embedding_service = EmbeddingService()


# Pydantic models for request/response
class ChatRequest(BaseModel):
    message: str
    document_id: int
    chat_id: Optional[int] = None


class ChatResponse(BaseModel):
    response: str
    similarity_score: Optional[float] = None


class CreateChatRequest(BaseModel):
    title: str
    document_id: int
    # main.py  (append near the other routes)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "DocuMind API"}


@app.on_event("startup")
async def startup():
    """Initialize database and services on startup."""
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "DOCUMIND API is running", "status": "healthy"}


@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a document."""
    try:
        # Validate file type
        allowed_types = [
            "application/pdf",
            "text/plain",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]

        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Only PDF, TXT, DOC, and DOCX files are supported",
            )

        # Validate file size (50MB limit)
        file_size = 0
        content = await file.read()
        file_size = len(content)

        if file_size > 50 * 1024 * 1024:  # 50MB
            raise HTTPException(
                status_code=400, detail="File size must be less than 50MB"
            )

        # Reset file pointer
        await file.seek(0)

        # Save file temporarily
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=f"_{file.filename}"
        ) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name

        try:
            # Process document
            document = await document_service.process_document(
                file_path=tmp_file_path, filename=file.filename, file_size=file_size
            )

            return {
                "id": document.id,
                "name": document.filename,
                "size": f"{file_size / (1024 * 1024):.2f} MB",
                "uploaded": "Just now",
                "status": "processed",
                "created_at": document.created_at.isoformat(),
            }

        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/documents")
async def get_documents():
    """Get all documents."""
    try:
        documents = await document_service.get_all_documents()
        return [
            {
                "id": doc.id,
                "name": doc.filename,
                "size": f"{doc.file_size / (1024 * 1024):.2f} MB",
                "uploaded": doc.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "status": "processed",
            }
            for doc in documents
        ]
    except Exception as e:
        logger.error(f"Error getting documents: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/chat")
async def chat_with_document(request: ChatRequest):
    """Chat with a document using AI."""
    try:
        # Get document
        document = await document_service.get_document(request.document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Generate response using embeddings and vector search
        response = await chat_service.generate_response(
            message=request.message, document=document, chat_id=request.chat_id
        )

        return ChatResponse(
            response=response["response"],
            similarity_score=response.get("similarity_score"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/chats")
async def create_chat(request: CreateChatRequest):
    """Create a new chat session."""
    try:
        chat = await chat_service.create_chat(
            title=request.title, document_id=request.document_id
        )

        return {
            "id": chat.id,
            "title": chat.title,
            "document_id": chat.document_id,
            "created_at": chat.created_at.isoformat(),
        }

    except Exception as e:
        logger.error(f"Error creating chat: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/chats")
async def get_chats():
    """Get all chat sessions."""
    try:
        chats = await chat_service.get_all_chats()
        return [
            {
                "id": chat.id,
                "title": chat.title,
                "timestamp": chat.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "preview": "Chat session...",  # Could be enhanced with actual preview
            }
            for chat in chats
        ]
    except Exception as e:
        logger.error(f"Error getting chats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/chats/{document_id}/messages")
async def get_chat_messages(document_id: int):
    """Get chat messages for a document."""
    try:
        messages = await chat_service.get_messages_by_document(document_id)
        return [
            {
                "id": msg.id,
                "type": "user" if msg.is_user else "ai",
                "content": msg.content,
                "timestamp": msg.created_at.strftime("%H:%M:%S"),
            }
            for msg in messages
        ]
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
