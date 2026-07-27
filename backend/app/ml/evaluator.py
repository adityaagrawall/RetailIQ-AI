import numpy as np
import pandas as pd
from app.utils.logger import get_logger

logger = get_logger(__name__)


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    """
    Compute standard regression metrics for forecast evaluation.

    Returns:
        MAE  - Mean Absolute Error (units)
        RMSE - Root Mean Squared Error (units, penalizes large errors)
        MAPE - Mean Absolute Percentage Error (%, interpretable by business)
    """
    y_true = np.array(y_true, dtype=float)
    y_pred = np.array(y_pred, dtype=float)

    mae = np.mean(np.abs(y_true - y_pred))
    rmse = np.sqrt(np.mean((y_true - y_pred) ** 2))

    # MAPE: skip rows where actual is 0 to avoid division by zero
    mask = y_true != 0
    if mask.sum() > 0:
        mape = np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100
    else:
        mape = None

    return {
        "mae": round(float(mae), 4),
        "rmse": round(float(rmse), 4),
        "mape": round(float(mape), 4) if mape is not None else None,
    }


def train_test_split_timeseries(df: pd.DataFrame, test_pct: float = 0.2):
    """
    Time-aware split — the last test_pct% of rows form the test set.
    Never shuffles, to prevent data leakage.
    """
    split_idx = int(len(df) * (1 - test_pct))
    return df.iloc[:split_idx].copy(), df.iloc[split_idx:].copy()
