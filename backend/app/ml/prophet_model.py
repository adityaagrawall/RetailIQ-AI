import pandas as pd
import numpy as np
from typing import List, Optional, Tuple
import os
import joblib
from datetime import datetime

from app.utils.logger import get_logger
from app.config.settings import settings
from app.ml.preprocessing import prepare_timeseries
from app.ml.evaluator import compute_metrics, train_test_split_timeseries

logger = get_logger(__name__)


def train_prophet(
    df_daily: pd.DataFrame,
    horizon_days: int = 30,
    product_id: Optional[int] = None,
) -> Tuple[List[dict], dict, str]:
    """
    Train a Prophet model on daily sales data and produce forecasts.

    Returns:
        forecasts: List of {date, predicted_quantity, lower_bound, upper_bound}
        metrics:   {mae, rmse, mape} on held-out test set
        artifact_path: path to saved model
    """
    from prophet import Prophet

    df = prepare_timeseries(df_daily)

    if len(df) < 30:
        logger.warning(f"Product {product_id}: insufficient data ({len(df)} days), skipping Prophet")
        return [], {"mae": None, "rmse": None, "mape": None}, ""

    # Train/test split (last 20% = test)
    train_df, test_df = train_test_split_timeseries(df, test_pct=0.2)

    # Build Prophet model
    model = Prophet(
        seasonality_mode="multiplicative",  # Better for retail (proportional seasonality)
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        interval_width=0.95,               # 95% confidence intervals
        changepoint_prior_scale=0.05,      # Regularization on trend changes
    )
    model.add_country_holidays(country_name="GB")  # UK retail dataset

    # Fit on training data
    model.fit(train_df[["ds", "y"]])

    # Evaluate on test set
    test_future = model.make_future_dataframe(periods=len(test_df), include_history=False)
    test_future["ds"] = test_df["ds"].values
    test_forecast = model.predict(test_future)
    metrics = compute_metrics(test_df["y"].values, test_forecast["yhat"].values)

    # Produce future forecast
    future = model.make_future_dataframe(periods=horizon_days, include_history=False)
    forecast = model.predict(future)

    forecasts = [
        {
            "date": row["ds"].date(),
            "predicted_quantity": max(0.0, float(row["yhat"])),  # Clip negatives
            "lower_bound": max(0.0, float(row["yhat_lower"])),
            "upper_bound": max(0.0, float(row["yhat_upper"])),
        }
        for _, row in forecast.iterrows()
    ]

    # Save model artifact
    artifact_path = ""
    if product_id:
        artifact_path = os.path.join(
            settings.ml_artifacts_dir,
            f"prophet_product_{product_id}.pkl"
        )
        os.makedirs(os.path.dirname(artifact_path), exist_ok=True)
        joblib.dump(model, artifact_path)

    logger.info(
        f"Prophet trained for product {product_id}: "
        f"MAE={metrics['mae']}, RMSE={metrics['rmse']}, MAPE={metrics.get('mape')}%"
    )

    return forecasts, metrics, artifact_path
