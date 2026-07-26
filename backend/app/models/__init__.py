"""Register all SQLAlchemy models so Alembic can discover them."""

from app.models.product import Product
from app.models.transaction import Transaction
from app.models.daily_sales import DailySales
from app.models.forecast import Forecast
from app.models.ml_run import MLRun
from app.models.alert import InventoryAlert
from app.models.ai_insight import AIInsight
from app.models.upload import Upload

__all__ = [
    "Product",
    "Transaction",
    "DailySales",
    "Forecast",
    "MLRun",
    "InventoryAlert",
    "AIInsight",
    "Upload",
]
