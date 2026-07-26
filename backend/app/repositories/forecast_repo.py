from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import date

from app.models.forecast import Forecast
from app.models.ml_run import MLRun


class ForecastRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_run(self, model_name: str, parameters: dict) -> MLRun:
        run = MLRun(
            model_name=model_name,
            parameters=parameters,
            status="running",
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def update_run(self, run_id: int, **kwargs):
        self.db.query(MLRun).filter(MLRun.id == run_id).update(kwargs)
        self.db.commit()

    def get_run(self, run_id: int) -> Optional[MLRun]:
        return self.db.query(MLRun).filter(MLRun.id == run_id).first()

    def list_runs(self, limit: int = 20) -> List[MLRun]:
        return (
            self.db.query(MLRun)
            .order_by(desc(MLRun.created_at))
            .limit(limit)
            .all()
        )

    def save_forecasts(self, product_id: int, run_id: int, forecast_rows: List[dict]):
        """Bulk save forecast rows. Deletes existing forecasts for product+run first."""
        self.db.query(Forecast).filter(
            Forecast.product_id == product_id,
            Forecast.model_run_id == run_id,
        ).delete()

        records = [
            Forecast(
                product_id=product_id,
                model_run_id=run_id,
                forecast_date=row["date"],
                predicted_quantity=row["predicted_quantity"],
                lower_bound=row.get("lower_bound"),
                upper_bound=row.get("upper_bound"),
            )
            for row in forecast_rows
        ]
        self.db.add_all(records)
        self.db.commit()

    def get_forecasts(
        self,
        product_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        model_name: Optional[str] = None,
    ) -> List[Forecast]:
        query = (
            self.db.query(Forecast)
            .join(MLRun, Forecast.model_run_id == MLRun.id)
            .filter(Forecast.product_id == product_id)
            .filter(MLRun.status == "completed")
        )
        if model_name:
            query = query.filter(MLRun.model_name == model_name)
        if start_date:
            query = query.filter(Forecast.forecast_date >= start_date)
        if end_date:
            query = query.filter(Forecast.forecast_date <= end_date)

        return query.order_by(Forecast.forecast_date).all()

    def get_latest_run_for_product(self, product_id: int, model_name: str) -> Optional[MLRun]:
        return (
            self.db.query(MLRun)
            .join(Forecast, Forecast.model_run_id == MLRun.id)
            .filter(Forecast.product_id == product_id, MLRun.model_name == model_name)
            .order_by(desc(MLRun.created_at))
            .first()
        )
