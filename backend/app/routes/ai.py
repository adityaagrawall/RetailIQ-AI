from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.config.database import get_db
from app.services.ai_service import AIService
from app.schemas.ai import (
    AIQueryRequest, AIQueryResponse,
    AISummaryResponse,
    AIExplainRequest, AIExplainResponse,
)

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/query", response_model=AIQueryResponse)
def query_ai(request: AIQueryRequest, db: Session = Depends(get_db)):
    """
    Ask a natural-language question about your inventory and sales data.
    Powered by Google Gemini with structured business context.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    svc = AIService(db)
    try:
        return svc.answer_question(request.question)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)[:200]}")


@router.get("/summary", response_model=AISummaryResponse)
def get_daily_summary(
    date: str = None,
    db: Session = Depends(get_db),
):
    """
    Get an AI-generated executive summary of current retail performance.
    Results are cached for 24 hours.
    """
    svc = AIService(db)
    try:
        return svc.get_daily_summary(date)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)[:200]}")


@router.post("/explain-forecast", response_model=AIExplainResponse)
def explain_forecast(request: AIExplainRequest, db: Session = Depends(get_db)):
    """
    Generate a plain-English explanation of a product's demand forecast.
    """
    from app.services.forecast_service import ForecastService
    forecast_svc = ForecastService(db)
    forecast_data = forecast_svc.get_product_forecast(request.product_id, horizon_days=request.horizon_days)

    svc = AIService(db)
    try:
        return svc.explain_forecast(request.product_id, forecast_data)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)[:200]}")
