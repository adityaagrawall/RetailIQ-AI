import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from app.ml.prophet_model import train_prophet
from app.ml.xgboost_model import train_xgboost
from app.repositories.forecast_repo import ForecastRepository
from app.repositories.product_repo import ProductRepository
from app.models.daily_sales import DailySales
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class ForecastService:
    def __init__(self, db: Session):
        self.db = db
        self.forecast_repo = ForecastRepository(db)
        self.product_repo = ProductRepository(db)

    def trigger_training(
        self,
        model_name: str = "prophet",
        product_ids: Optional[List[int]] = None,
        horizon_days: int = 30,
    ) -> int:
        """
        Create an ML run record, train models for all/specified products,
        and store forecasts. Returns run_id.
        """
        from app.models.product import Product
        from sqlalchemy import func

        parameters = {
            "model": model_name,
            "horizon_days": horizon_days,
            "training_started": datetime.utcnow().isoformat(),
        }
        run = self.forecast_repo.create_run(model_name, parameters)
        run_id = run.id

        # Get products to train
        if product_ids:
            products = self.db.query(Product).filter(Product.id.in_(product_ids)).all()
        else:
            # Train only products with enough data (>= 30 days of sales)
            subq = (
                self.db.query(DailySales.product_id)
                .group_by(DailySales.product_id)
                .having(func.count(DailySales.id) >= 30)
                .subquery()
            )
            products = self.db.query(Product).filter(Product.id.in_(subq)).all()

        logger.info(f"Run {run_id}: Training {model_name} for {len(products)} products")

        self.forecast_repo.update_run(run_id, training_start=datetime.utcnow())

        all_mae, all_rmse, all_mape = [], [], []
        trained_count = 0

        for product in products:
            try:
                daily_rows = (
                    self.db.query(DailySales)
                    .filter(DailySales.product_id == product.id)
                    .order_by(DailySales.sale_date)
                    .all()
                )
                df_daily = pd.DataFrame([{
                    "sale_date": r.sale_date,
                    "total_quantity": r.total_quantity,
                    "total_revenue": float(r.total_revenue or 0),
                } for r in daily_rows])

                if model_name == "prophet":
                    forecasts, metrics, artifact_path = train_prophet(
                        df_daily, horizon_days, product.id
                    )
                elif model_name == "xgboost":
                    forecasts, metrics, artifact_path = train_xgboost(
                        df_daily, horizon_days, product.id
                    )
                else:
                    continue

                if forecasts:
                    self.forecast_repo.save_forecasts(product.id, run_id, forecasts)
                    if metrics["mae"] is not None:
                        all_mae.append(metrics["mae"])
                    if metrics["rmse"] is not None:
                        all_rmse.append(metrics["rmse"])
                    if metrics["mape"] is not None:
                        all_mape.append(metrics["mape"])
                    trained_count += 1

            except Exception as e:
                logger.error(f"Failed training {model_name} for product {product.id}: {e}")
                continue

        # Compute aggregate metrics across all products
        avg_mae = float(np.mean(all_mae)) if all_mae else None
        avg_rmse = float(np.mean(all_rmse)) if all_rmse else None
        avg_mape = float(np.mean(all_mape)) if all_mape else None

        self.forecast_repo.update_run(
            run_id,
            status="completed",
            training_end=datetime.utcnow(),
            products_trained=trained_count,
            mae=avg_mae,
            rmse=avg_rmse,
            mape=avg_mape,
        )

        logger.info(
            f"Run {run_id} completed: {trained_count} products, "
            f"avg MAE={avg_mae}, avg MAPE={avg_mape}%"
        )
        return run_id

    def get_product_forecast(
        self,
        product_id: int,
        model_name: str = "prophet",
        horizon_days: int = 30,
    ) -> dict:
        """Retrieve stored forecasts for a product, triggering training if none exist."""
        from datetime import date
        from datetime import timedelta

        forecasts = self.forecast_repo.get_forecasts(
            product_id,
            start_date=date.today(),
            end_date=date.today() + pd.Timedelta(days=horizon_days),
            model_name=model_name,
        )

        if not forecasts:
            # Auto-train on demand for this product
            self.trigger_training(model_name, [product_id], horizon_days)
            forecasts = self.forecast_repo.get_forecasts(
                product_id,
                start_date=date.today(),
                model_name=model_name,
            )

        product = self.product_repo.get_by_id(product_id)
        run = self.forecast_repo.get_latest_run_for_product(product_id, model_name)

        return {
            "product_id": product_id,
            "product_stock_code": product.stock_code if product else "",
            "product_description": product.description if product else None,
            "model_name": model_name,
            "model_run_id": run.id if run else 0,
            "horizon_days": horizon_days,
            "forecasts": [
                {
                    "date": f.forecast_date,
                    "predicted_quantity": float(f.predicted_quantity),
                    "lower_bound": float(f.lower_bound) if f.lower_bound else None,
                    "upper_bound": float(f.upper_bound) if f.upper_bound else None,
                }
                for f in forecasts
            ],
            "metrics": {
                "mae": float(run.mae) if run and run.mae else None,
                "rmse": float(run.rmse) if run and run.rmse else None,
                "mape": float(run.mape) if run and run.mape else None,
            } if run else None,
        }
