import pandas as pd
import numpy as np
from typing import List, Optional, Tuple
import os
import joblib
from datetime import datetime, timedelta

from xgboost import XGBRegressor
from app.utils.logger import get_logger
from app.config.settings import settings
from app.ml.preprocessing import prepare_timeseries, engineer_features, FEATURE_COLUMNS
from app.ml.evaluator import compute_metrics, train_test_split_timeseries

logger = get_logger(__name__)


def train_xgboost(
    df_daily: pd.DataFrame,
    horizon_days: int = 30,
    product_id: Optional[int] = None,
) -> Tuple[List[dict], dict, str]:
    """
    Train an XGBoost regression model on engineered tabular features.

    Returns:
        forecasts: List of {date, predicted_quantity, lower_bound, upper_bound}
        metrics:   {mae, rmse, mape}
        artifact_path: path to saved model
    """
    df = prepare_timeseries(df_daily)

    if len(df) < 60:
        logger.warning(
            f"Product {product_id}: insufficient data ({len(df)} days) for XGBoost (needs 60+)"
        )
        return [], {"mae": None, "rmse": None, "mape": None}, ""

    df_feat = engineer_features(df)

    if df_feat.empty:
        return [], {"mae": None, "rmse": None, "mape": None}, ""

    train_df, test_df = train_test_split_timeseries(df_feat, test_pct=0.2)

    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df["y"]
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["y"]

    model = XGBRegressor(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=5,
        min_child_weight=2,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,          # L1 regularization
        reg_lambda=1.0,         # L2 regularization
        random_state=42,
        n_jobs=-1,
        eval_metric="mae",
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    y_pred_test = model.predict(X_test)
    metrics = compute_metrics(y_test.values, y_pred_test)

    # Recursive multi-step forecast
    last_known = df_feat.iloc[-1].copy()
    history = df["y"].values.tolist()
    forecasts = []
    last_date = df["ds"].max()

    for step in range(horizon_days):
        future_date = last_date + timedelta(days=step + 1)
        row = _build_future_row(future_date, history, step)
        X_future = pd.DataFrame([row])[FEATURE_COLUMNS]
        pred = float(max(0, model.predict(X_future)[0]))

        # Simple bootstrap uncertainty: ±1 std of recent residuals
        recent_residuals_std = float(np.std(y_test.values - y_pred_test))
        forecasts.append({
            "date": future_date.date(),
            "predicted_quantity": round(pred, 2),
            "lower_bound": round(max(0, pred - 1.96 * recent_residuals_std), 2),
            "upper_bound": round(pred + 1.96 * recent_residuals_std, 2),
        })
        history.append(pred)

    # Save artifact
    artifact_path = ""
    if product_id:
        artifact_path = os.path.join(
            settings.ml_artifacts_dir,
            f"xgboost_product_{product_id}.pkl"
        )
        os.makedirs(os.path.dirname(artifact_path), exist_ok=True)
        joblib.dump(model, artifact_path)

    logger.info(
        f"XGBoost trained for product {product_id}: "
        f"MAE={metrics['mae']}, RMSE={metrics['rmse']}, MAPE={metrics.get('mape')}%"
    )

    return forecasts, metrics, artifact_path


def _build_future_row(future_date, history: list, step: int) -> dict:
    """Construct a feature row for a future date using known history."""
    h = history

    def safe_get(idx):
        return h[idx] if abs(idx) <= len(h) else 0.0

    return {
        "day_of_week": future_date.dayofweek,
        "day_of_month": future_date.day,
        "week_of_year": future_date.isocalendar()[1],
        "month": future_date.month,
        "quarter": (future_date.month - 1) // 3 + 1,
        "is_weekend": int(future_date.dayofweek >= 5),
        "year": future_date.year,
        "lag_1": safe_get(-1),
        "lag_7": safe_get(-7),
        "lag_14": safe_get(-14),
        "lag_28": safe_get(-28),
        "rolling_7_mean": float(np.mean(h[-7:])) if len(h) >= 7 else float(np.mean(h)),
        "rolling_14_mean": float(np.mean(h[-14:])) if len(h) >= 14 else float(np.mean(h)),
        "rolling_28_mean": float(np.mean(h[-28:])) if len(h) >= 28 else float(np.mean(h)),
        "rolling_7_std": float(np.std(h[-7:])) if len(h) >= 7 else 0.0,
        "trend_signal": safe_get(-1) - (float(np.mean(h[-7:])) if len(h) >= 7 else float(np.mean(h))),
    }


def get_feature_importance(product_id: int) -> dict:
    """Load saved XGBoost model and return feature importance."""
    path = os.path.join(settings.ml_artifacts_dir, f"xgboost_product_{product_id}.pkl")
    if not os.path.exists(path):
        return {}
    model = joblib.load(path)
    importance = dict(zip(FEATURE_COLUMNS, model.feature_importances_.tolist()))
    return dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
