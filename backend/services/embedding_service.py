import os
import logging
import pickle
import numpy as np
from typing import List, Dict, Any, Optional
import faiss

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sqlalchemy import select

from models.models import Document, DocumentEmbedding
from database.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            logger.warning("GOOGLE_API_KEY not found. Embeddings will not work.")
            self.embeddings = None
        else:
            try:
                self.embeddings = GoogleGenerativeAIEmbeddings(
                    model="models/gemini-embedding-001",
                    google_api_key=self.api_key
                )
            except Exception as e:
                logger.error(f"Failed to initialize embeddings: {e}")
                self.embeddings = None
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        
        # Initialize FAISS index directory
        self.index_dir = "faiss_indexes"
        os.makedirs(self.index_dir, exist_ok=True)
    
    async def generate_document_embeddings(self, document: Document, content: str):
        """Generate and store embeddings for a document."""
        if not self.embeddings:
            logger.warning("Embeddings service not available")
            return
        
        try:
            # Split text into chunks
            chunks = self.text_splitter.split_text(content)
            
            if not chunks:
                logger.warning(f"No chunks generated for document {document.id}")
                return
            
            # Generate embeddings for chunks
            embeddings_list = self.embeddings.embed_documents(chunks)
            
            # Store embeddings in database
            async with AsyncSessionLocal() as db:
                for i, (chunk, embedding) in enumerate(zip(chunks, embeddings_list)):
                    doc_embedding = DocumentEmbedding(
                        document_id=document.id,
                        chunk_text=chunk,
                        chunk_index=i,
                        embedding=pickle.dumps(np.array(embedding))
                    )
                    db.add(doc_embedding)
                
                await db.commit()
            
            # Create and save FAISS index
            await self._create_faiss_index(document.id, embeddings_list)
            
            logger.info(f"Generated {len(embeddings_list)} embeddings for document {document.id}")
            
        except Exception as e:
            logger.error(f"Error generating embeddings for document {document.id}: {e}")
            raise
    
    async def _create_faiss_index(self, document_id: int, embeddings_list: List[List[float]]):
        """Create and save FAISS index for a document."""
        try:
            # Convert embeddings to numpy array
            embeddings_array = np.array(embeddings_list).astype('float32')
            
            # Create FAISS index
            dimension = embeddings_array.shape[1]
            index = faiss.IndexFlatIP(dimension)  # Inner product for similarity
            
            # Normalize embeddings for cosine similarity
            faiss.normalize_L2(embeddings_array)
            index.add(embeddings_array)
            
            # Save index
            index_path = os.path.join(self.index_dir, f"document_{document_id}.index")
            faiss.write_index(index, index_path)
            
            logger.info(f"Created FAISS index for document {document_id}")
            
        except Exception as e:
            logger.error(f"Error creating FAISS index for document {document_id}: {e}")
            raise
    
    async def search_similar_chunks(self, document_id: int, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for similar chunks in a document using FAISS."""
        if not self.embeddings:
            logger.warning("Embeddings service not available")
            return []
        
        try:
            # Generate query embedding
            query_embedding = self.embeddings.embed_query(query)
            query_vector = np.array([query_embedding]).astype('float32')
            faiss.normalize_L2(query_vector)
            
            # Load FAISS index
            index_path = os.path.join(self.index_dir, f"document_{document_id}.index")
            if not os.path.exists(index_path):
                logger.warning(f"FAISS index not found for document {document_id}")
                return []
            
            index = faiss.read_index(index_path)
            
            # Search similar vectors
            scores, indices = index.search(query_vector, top_k)
            
            # Get corresponding chunks from database
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(DocumentEmbedding)
                    .where(DocumentEmbedding.document_id == document_id)
                    .order_by(DocumentEmbedding.chunk_index)
                )
                embeddings = result.scalars().all()
            
            # Prepare results
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < len(embeddings):
                    results.append({
                        "chunk_text": embeddings[idx].chunk_text,
                        "similarity_score": float(score),
                        "chunk_index": embeddings[idx].chunk_index
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching similar chunks for document {document_id}: {e}")
            return []
    
    async def get_document_embeddings(self, document_id: int) -> List[DocumentEmbedding]:
        """Get all embeddings for a document."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(DocumentEmbedding)
                .where(DocumentEmbedding.document_id == document_id)
                .order_by(DocumentEmbedding.chunk_index)
            )
            return result.scalars().all()
    
    def is_available(self) -> bool:
        """Check if embeddings service is available."""
        return self.embeddings is not None