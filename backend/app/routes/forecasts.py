from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.config.database import get_db, SessionLocal
from app.services.forecast_service import ForecastService
from app.repositories.forecast_repo import ForecastRepository
from app.schemas.forecast import TrainRequest, TrainResponse, MLRunResponse

router = APIRouter(prefix="/forecasts", tags=["Forecasts"])


def train_task(model_name: str, product_ids: Optional[List[int]], horizon_days: int):
    """Background worker wrapper for ML training with isolated DB session."""
    db = SessionLocal()
    try:
        svc = ForecastService(db)
        svc.trigger_training(model_name, product_ids, horizon_days)
    finally:
        db.close()


@router.post("/train", response_model=TrainResponse)
def train_models(
    request: TrainRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Trigger ML model training (Prophet or XGBoost).
    Runs in background. Returns run_id immediately.
    """
    svc = ForecastService(db)
    run_repo = ForecastRepository(db)

    # Create run record before background task
    run = run_repo.create_run(
        request.model,
        {"horizon_days": request.horizon_days, "product_ids": request.product_ids},
    )

    background_tasks.add_task(
        train_task,
        request.model,
        request.product_ids,
        request.horizon_days,
    )

    products_queued = len(request.product_ids) if request.product_ids else "all"
    return TrainResponse(
        run_id=run.id,
        status="running",
        message=f"Training {request.model} for {products_queued} products in background.",
        products_queued=len(request.product_ids) if request.product_ids else 0,
    )


@router.get("/{product_id}")
def get_product_forecast(
    product_id: int,
    model: str = Query("prophet", pattern="^(prophet|xgboost)$"),
    horizon_days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
):
    """
    Get demand forecast for a product. Triggers training automatically if no forecast exists.
    Returns forecast with 95% confidence intervals.
    """
    svc = ForecastService(db)
    return svc.get_product_forecast(product_id, model, horizon_days)


@router.get("/runs/list")
def list_ml_runs(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List recent ML training runs with metrics."""
    repo = ForecastRepository(db)
    runs = repo.list_runs(limit)
    return [
        {
            "id": r.id,
            "model_name": r.model_name,
            "status": r.status,
            "products_trained": r.products_trained,
            "mae": float(r.mae) if r.mae else None,
            "rmse": float(r.rmse) if r.rmse else None,
            "mape": float(r.mape) if r.mape else None,
            "training_start": r.training_start,
            "training_end": r.training_end,
            "created_at": r.created_at,
        }
        for r in runs
    ]


@router.get("/runs/{run_id}", response_model=MLRunResponse)
def get_ml_run(run_id: int, db: Session = Depends(get_db)):
    """Get detail for a specific ML training run."""
    repo = ForecastRepository(db)
    run = repo.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"ML run {run_id} not found.")
    return run
