import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from langchain_google_genai import ChatGoogleGenerativeAI
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from models.models import Document, Chat, Message
from database.database import AsyncSessionLocal
from services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        self.embedding_service = EmbeddingService()
        
        if not self.api_key:
            logger.warning("GOOGLE_API_KEY not found. Chat service will not work.")
            self.llm = None
        else:
            try:
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-1.5-flash",
                    google_api_key=self.api_key,
                    temperature=0.7
                )
            except Exception as e:
                logger.error(f"Failed to initialize chat service: {e}")
                self.llm = None
    
    async def generate_response(self, message: str, document: Document, chat_id: Optional[int] = None) -> Dict[str, Any]:
        """Generate AI response for a user message."""
        try:
            # Search for relevant chunks
            similar_chunks = await self.embedding_service.search_similar_chunks(
                document.id, message, top_k=3
            )
            
            # Prepare context from similar chunks
            context = ""
            similarity_score = 0.0
            
            if similar_chunks:
                context = "\n\n".join([chunk["chunk_text"] for chunk in similar_chunks])
                similarity_score = similar_chunks[0]["similarity_score"] if similar_chunks else 0.0
            else:
                # Fallback to using document content directly
                context = document.content[:2000] if document.content else "No content available"
            
            # Generate response
            if self.llm and context:
                prompt = self._create_prompt(message, context, document.filename)
                response = await self._generate_llm_response(prompt)
            else:
                response = self._generate_fallback_response(message, document.filename)
            
            # Store message and response in database
            if chat_id:
                await self._store_messages(chat_id, message, response, similarity_score)
            
            return {
                "response": response,
                "similarity_score": similarity_score
            }
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return {
                "response": f"I apologize, but I encountered an error while processing your question about {document.filename}. Please try again.",
                "similarity_score": 0.0
            }
    
    def _create_prompt(self, user_message: str, context: str, filename: str) -> str:
        """Create a prompt for the LLM."""
        return f"""You are an AI assistant helping users understand and analyze documents. 

Document: {filename}

Relevant context from the document:
{context}

User question: {user_message}

Please provide a helpful, accurate response based on the document context. If the context doesn't contain enough information to answer the question, please say so clearly. Always be specific and reference the document when appropriate."""
    
    async def _generate_llm_response(self, prompt: str) -> str:
        """Generate response using the LLM."""
        try:
            response = await self.llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            logger.error(f"Error generating LLM response: {e}")
            return "I apologize, but I'm having trouble generating a response right now. Please try again."
    
    def _generate_fallback_response(self, message: str, filename: str) -> str:
        """Generate a fallback response when LLM is not available."""
        return f"""I understand you're asking about "{message}" regarding the document "{filename}". 

While I'm currently unable to access the full AI capabilities, I can confirm that your document has been processed and stored. In a fully operational environment, I would:

1. Search through the document content using semantic similarity
2. Find the most relevant sections related to your question
3. Provide specific answers based on the document content
4. Offer follow-up suggestions for deeper analysis

Please ensure your Google API key is configured to enable full AI responses."""
    
    async def _store_messages(self, chat_id: int, user_message: str, ai_response: str, similarity_score: float):
        """Store user message and AI response in database."""
        try:
            async with AsyncSessionLocal() as db:
                # Store user message
                user_msg = Message(
                    chat_id=chat_id,
                    content=user_message,
                    is_user=True
                )
                db.add(user_msg)
                
                # Store AI response
                ai_msg = Message(
                    chat_id=chat_id,
                    content=ai_response,
                    is_user=False,
                    similarity_score=similarity_score
                )
                db.add(ai_msg)
                
                await db.commit()
                
        except Exception as e:
            logger.error(f"Error storing messages: {e}")
    
    async def create_chat(self, title: str, document_id: int) -> Chat:
        """Create a new chat session."""
        async with AsyncSessionLocal() as db:
            chat = Chat(
                title=title,
                document_id=document_id
            )
            db.add(chat)
            await db.commit()
            await db.refresh(chat)
            return chat
    
    async def get_chat(self, chat_id: int) -> Optional[Chat]:
        """Get a chat by ID."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Chat).where(Chat.id == chat_id)
            )
            return result.scalar_one_or_none()
    
    async def get_all_chats(self) -> List[Chat]:
        """Get all chats."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Chat).order_by(Chat.created_at.desc())
            )
            return result.scalars().all()
    
    async def get_messages_by_document(self, document_id: int) -> List[Message]:
        """Get all messages for a document."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Message)
                .join(Chat)
                .where(Chat.document_id == document_id)
                .order_by(Message.created_at.asc())
            )
            return result.scalars().all()
    
    async def get_chat_messages(self, chat_id: int) -> List[Message]:
        """Get all messages for a chat."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Message)
                .where(Message.chat_id == chat_id)
                .order_by(Message.created_at.asc())
            )
            return result.scalars().all()
    
    def is_available(self) -> bool:
        """Check if chat service is available."""
        return self.llm is not None