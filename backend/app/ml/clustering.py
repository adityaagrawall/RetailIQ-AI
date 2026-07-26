import numpy as np
import pandas as pd
from typing import List, Tuple
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from app.utils.logger import get_logger

logger = get_logger(__name__)


def cluster_products(product_features: pd.DataFrame, n_clusters: int = 4) -> pd.DataFrame:
    """
    Cluster products by sales behavior using KMeans.

    Input columns expected: product_id, avg_daily_sales, total_revenue, sales_velocity, std_daily_sales

    Returns original df with added 'cluster' and 'cluster_label' columns.
    """
    if len(product_features) < n_clusters:
        product_features["cluster"] = 0
        product_features["cluster_label"] = "All Products"
        return product_features

    feature_cols = ["avg_daily_sales", "total_revenue", "std_daily_sales"]
    available = [c for c in feature_cols if c in product_features.columns]

    if not available:
        return product_features

    X = product_features[available].fillna(0).values

    # Standardize before clustering
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Determine optimal k via elbow (silhouette would be better but slower)
    k = min(n_clusters, len(product_features))
    km = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=300)
    labels = km.fit_predict(X_scaled)

    product_features = product_features.copy()
    product_features["cluster"] = labels

    # Label clusters by average revenue (high → low)
    cluster_revenue = product_features.groupby("cluster")["total_revenue"].mean()
    sorted_clusters = cluster_revenue.sort_values(ascending=False).index.tolist()
    CLUSTER_LABELS = ["Fast Movers", "High Value", "Moderate", "Slow Movers"]
    label_map = {c: CLUSTER_LABELS[i] for i, c in enumerate(sorted_clusters)}
    product_features["cluster_label"] = product_features["cluster"].map(label_map)

    logger.info(f"Product clustering complete: {k} clusters, {len(product_features)} products")
    return product_features
