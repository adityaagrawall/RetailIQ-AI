import pandas as pd
import numpy as np
from typing import Tuple
from app.utils.logger import get_logger

logger = get_logger(__name__)


def prepare_timeseries(df_daily: pd.DataFrame) -> pd.DataFrame:
    """
    Convert daily_sales records into a clean time-series DataFrame.
    Fills missing dates with zeros (Prophet requires complete date ranges).

    Input df_daily must have: sale_date, total_quantity, total_revenue
    Returns: DataFrame with columns [ds, y, revenue]
    """
    if df_daily.empty:
        return pd.DataFrame(columns=["ds", "y", "revenue"])

    df = df_daily.copy()
    df["ds"] = pd.to_datetime(df["sale_date"])
    df["y"] = df["total_quantity"].astype(float).clip(lower=0)
    df["revenue"] = df["total_revenue"].astype(float)

    # Fill complete date range (no gaps)
    date_range = pd.date_range(df["ds"].min(), df["ds"].max(), freq="D")
    df = df.set_index("ds").reindex(date_range).rename_axis("ds").reset_index()
    df["y"] = df["y"].fillna(0)
    df["revenue"] = df["revenue"].fillna(0)

    # Remove future dates
    df = df[df["ds"] <= pd.Timestamp.today()]

    return df[["ds", "y", "revenue"]]


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create tabular features for XGBoost from the time-series DataFrame.

    Features created:
    - Temporal: day_of_week, week_of_year, month, quarter, is_weekend
    - Lag: lag_1, lag_7, lag_14, lag_28
    - Rolling: rolling_7_mean, rolling_14_mean, rolling_28_mean
    - Rolling std: rolling_7_std
    - Target: y
    """
    df = df.copy().sort_values("ds").reset_index(drop=True)

    # Temporal features
    df["day_of_week"] = df["ds"].dt.dayofweek      # 0=Monday, 6=Sunday
    df["day_of_month"] = df["ds"].dt.day
    df["week_of_year"] = df["ds"].dt.isocalendar().week.astype(int)
    df["month"] = df["ds"].dt.month
    df["quarter"] = df["ds"].dt.quarter
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["year"] = df["ds"].dt.year

    # Lag features (shift target backward)
    for lag in [1, 7, 14, 28]:
        df[f"lag_{lag}"] = df["y"].shift(lag)

    # Rolling statistics
    df["rolling_7_mean"] = df["y"].shift(1).rolling(window=7, min_periods=1).mean()
    df["rolling_14_mean"] = df["y"].shift(1).rolling(window=14, min_periods=1).mean()
    df["rolling_28_mean"] = df["y"].shift(1).rolling(window=28, min_periods=1).mean()
    df["rolling_7_std"] = df["y"].shift(1).rolling(window=7, min_periods=2).std().fillna(0)

    # Trend: difference from 7-day rolling mean
    df["trend_signal"] = df["y"] - df["rolling_7_mean"]

    # Drop rows where lags can't be computed (first 28 days)
    df = df.dropna(subset=["lag_28"]).reset_index(drop=True)

    return df


FEATURE_COLUMNS = [
    "day_of_week", "day_of_month", "week_of_year", "month", "quarter",
    "is_weekend", "year", "lag_1", "lag_7", "lag_14", "lag_28",
    "rolling_7_mean", "rolling_14_mean", "rolling_28_mean", "rolling_7_std",
    "trend_signal",
]
