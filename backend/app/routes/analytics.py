from typing import Optional
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import date

from app.config.database import get_db
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import KPIResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/kpis", response_model=KPIResponse)
def get_kpis(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Dashboard KPIs: total revenue, transactions, avg order value, return rate."""
    svc = AnalyticsService(db)
    return svc.get_kpis(start_date, end_date)


@router.get("/abc")
def get_abc_analysis(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    ABC Analysis: classify products by revenue contribution.
    A = top 80% revenue | B = next 15% | C = bottom 5%
    Also updates products.abc_class in the database.
    """
    svc = AnalyticsService(db)
    return svc.compute_abc_analysis()


@router.get("/slow-movers")
def get_slow_movers(
    threshold_days: int = Query(30, ge=7, le=180),
    db: Session = Depends(get_db),
):
    """
    Detect slow-moving products using IQR on recent sales velocity.
    Products below Q1 - 1.5*IQR are flagged.
    """
    svc = AnalyticsService(db)
    return svc.get_slow_movers(threshold_days)


@router.get("/revenue-trend")
def get_revenue_trend(
    granularity: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    db: Session = Depends(get_db),
):
    """Revenue over time, aggregated by day, week, or month."""
    svc = AnalyticsService(db)
    return svc.get_revenue_trend(granularity)


@router.get("/top-products")
def get_top_products(
    n: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Top N products by total revenue."""
    svc = AnalyticsService(db)
    return svc.get_top_products(n)
