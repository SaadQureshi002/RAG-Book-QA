import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from models.models import Base

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pdf_owl.db")
ASYNC_DATABASE_URL = os.getenv("ASYNC_DATABASE_URL", "sqlite+aiosqlite:///./pdf_owl.db")

# Create engines
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)

# Create session factories
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    """Initialize database tables."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    """Get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Synchronous database session for non-async operations
def get_sync_db():
    """Get synchronous database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()