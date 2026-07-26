import numpy as np
import pandas as pd
from typing import List
from app.utils.logger import get_logger

logger = get_logger(__name__)


def detect_slow_movers_iqr(
    daily_sales_df: pd.DataFrame,
    lookback_days: int = 30,
) -> List[dict]:
    """
    IQR-based slow-mover detection.

    Logic:
        1. Compute each product's average daily sales over the last `lookback_days`
        2. Compute Q1, Q3, IQR across all products
        3. Flag products below (Q1 - 1.5 * IQR) as slow movers
        4. Assign severity: high if zero sales, medium if very low, low otherwise

    Input df: product_id, sale_date, total_quantity
    """
    if daily_sales_df.empty:
        return []

    # Filter to lookback window
    cutoff = pd.Timestamp.today() - pd.Timedelta(days=lookback_days)
    recent = daily_sales_df[daily_sales_df["sale_date"] >= cutoff.date()]

    if recent.empty:
        return []

    # Aggregate to product level
    agg = (
        recent.groupby("product_id")["total_quantity"]
        .agg(["mean", "sum", "count"])
        .rename(columns={"mean": "avg_sales", "sum": "total_sales", "count": "active_days"})
        .reset_index()
    )

    velocities = agg["avg_sales"].values
    q1 = np.percentile(velocities, 25)
    q3 = np.percentile(velocities, 75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr

    slow_movers = []
    for _, row in agg.iterrows():
        if row["avg_sales"] <= lower_bound:
            vel = float(row["avg_sales"])
            if vel == 0:
                severity = "high"
            elif vel < lower_bound / 2:
                severity = "medium"
            else:
                severity = "low"

            slow_movers.append({
                "product_id": int(row["product_id"]),
                "avg_daily_sales": round(vel, 4),
                "threshold": round(float(lower_bound), 4),
                "active_days": int(row["active_days"]),
                "severity": severity,
            })

    logger.info(f"Slow-mover detection: {len(slow_movers)} flagged out of {len(agg)} products")
    return slow_movers


def detect_sales_anomalies(daily_sales_df: pd.DataFrame, z_threshold: float = 3.0) -> List[dict]:
    """
    Z-score anomaly detection on daily sales per product.

    Flags individual days where sales deviate > z_threshold std deviations from
    the product's historical mean.
    """
    if daily_sales_df.empty:
        return []

    anomalies = []
    for product_id, group in daily_sales_df.groupby("product_id"):
        qty = group["total_quantity"].values.astype(float)
        if len(qty) < 10:
            continue

        mean = np.mean(qty)
        std = np.std(qty)
        if std == 0:
            continue

        z_scores = np.abs((qty - mean) / std)
        anomaly_mask = z_scores > z_threshold

        for idx, (is_anomaly, z) in enumerate(zip(anomaly_mask, z_scores)):
            if is_anomaly:
                date_val = group.iloc[idx]["sale_date"]
                qty_val = float(group.iloc[idx]["total_quantity"])
                anomalies.append({
                    "product_id": int(product_id),
                    "date": date_val,
                    "quantity": qty_val,
                    "z_score": round(float(z), 2),
                    "direction": "spike" if qty_val > mean else "drop",
                })

    return anomalies
