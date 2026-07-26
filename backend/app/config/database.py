from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,        # Detect stale connections
    pool_size=10,              # Connection pool size
    max_overflow=20,           # Extra connections beyond pool_size
    pool_recycle=3600,         # Recycle connections every hour
    echo=settings.debug,       # Log SQL queries only in debug mode
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a database session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
