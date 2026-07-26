from app.config.database import Base
from sqlalchemy import Column, Integer, String, DateTime, Text, func, Index


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    insight_type = Column(String(50), nullable=False, index=True)
    # Types: 'daily_summary', 'product_qa', 'forecast_explain'
    context_hash = Column(String(64), unique=True, index=True)  # SHA-256 of input context
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    model_used = Column(String(50))
    tokens_used = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_ai_insights_type_created", "insight_type", "created_at"),
    )
