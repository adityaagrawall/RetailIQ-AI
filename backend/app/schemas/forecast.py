from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class ForecastPoint(BaseModel):
    date: date
    predicted_quantity: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None


class ForecastResponse(BaseModel):
    product_id: int
    product_stock_code: str
    product_description: Optional[str]
    model_name: str
    model_run_id: int
    horizon_days: int
    forecasts: List[ForecastPoint]
    metrics: Optional[dict] = None


class TrainRequest(BaseModel):
    product_ids: Optional[List[int]] = None  # None = train all products
    model: str = "prophet"  # 'prophet' or 'xgboost'
    horizon_days: int = 30


class TrainResponse(BaseModel):
    run_id: int
    status: str
    message: str
    products_queued: int


class MLRunResponse(BaseModel):
    id: int
    model_name: str
    model_version: str
    status: str
    products_trained: Optional[int]
    mae: Optional[float]
    rmse: Optional[float]
    mape: Optional[float]
    parameters: Optional[dict]
    training_start: Optional[datetime]
    training_end: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}
