from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AIQueryRequest(BaseModel):
    question: str

    model_config = {"json_schema_extra": {"example": {"question": "Which 5 products need immediate restocking?"}}}


class AIQueryResponse(BaseModel):
    answer: str
    question: str
    model_used: str
    from_cache: bool
    generated_at: datetime
    context_summary: Optional[dict] = None


class AISummaryResponse(BaseModel):
    summary: str
    model_used: str
    from_cache: bool
    generated_at: datetime
    date: str


class AIExplainRequest(BaseModel):
    product_id: int
    horizon_days: int = 30


class AIExplainResponse(BaseModel):
    explanation: str
    product_id: int
    model_used: str
    generated_at: datetime
