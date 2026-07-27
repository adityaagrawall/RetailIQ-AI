from app.config.database import Base
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, func


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_size = Column(Integer)  # Bytes
    row_count = Column(Integer)
    valid_rows = Column(Integer)
    invalid_rows = Column(Integer)
    status = Column(String(20), default="pending", nullable=False, index=True)
    # Status: 'pending', 'processing', 'completed', 'failed'
    is_active = Column(Boolean, default=False, nullable=False)
    error_message = Column(Text)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))

    def __repr__(self):
        return f"<Upload(filename={self.filename}, status={self.status})>"
