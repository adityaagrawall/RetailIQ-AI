from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from app.models.ai_insight import AIInsight
from app.config.settings import settings


class AIInsightRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_cached(self, context_hash: str) -> Optional[AIInsight]:
        """Return a cached insight if it exists and hasn't expired."""
        cutoff = datetime.utcnow() - timedelta(hours=settings.ai_cache_ttl_hours)
        return (
            self.db.query(AIInsight)
            .filter(
                AIInsight.context_hash == context_hash,
                AIInsight.created_at >= cutoff,
            )
            .first()
        )

    def save(
        self,
        insight_type: str,
        context_hash: str,
        prompt: str,
        response: str,
        model_used: str,
        tokens_used: int = 0,
    ) -> AIInsight:
        # Use upsert: if hash exists update it, else insert
        existing = self.db.query(AIInsight).filter(AIInsight.context_hash == context_hash).first()
        if existing:
            existing.response = response
            existing.model_used = model_used
            existing.tokens_used = tokens_used
            existing.created_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(existing)
            return existing

        insight = AIInsight(
            insight_type=insight_type,
            context_hash=context_hash,
            prompt=prompt,
            response=response,
            model_used=model_used,
            tokens_used=tokens_used,
        )
        self.db.add(insight)
        self.db.commit()
        self.db.refresh(insight)
        return insight
