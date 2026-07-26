"""Routes package — import all routers for easy access in main.py."""

from app.routes import upload, products, analytics, forecasts, alerts, ai, export

__all__ = ["upload", "products", "analytics", "forecasts", "alerts", "ai", "export"]
