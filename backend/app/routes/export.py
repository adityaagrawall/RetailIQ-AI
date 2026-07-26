import io
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date

from app.config.database import get_db

router = APIRouter(prefix="/export", tags=["Export"])


@router.get("/forecasts")
def export_forecasts_csv(
    product_ids: Optional[str] = Query(None, description="Comma-separated product IDs"),
    db: Session = Depends(get_db),
):
    """Export demand forecasts as CSV for selected products."""
    from app.models.forecast import Forecast
    from app.models.product import Product
    from app.models.ml_run import MLRun
    import csv

    query = (
        db.query(
            Forecast.forecast_date,
            Forecast.predicted_quantity,
            Forecast.lower_bound,
            Forecast.upper_bound,
            Product.stock_code,
            Product.description,
            MLRun.model_name,
        )
        .join(Product, Forecast.product_id == Product.id)
        .join(MLRun, Forecast.model_run_id == MLRun.id)
        .filter(MLRun.status == "completed")
        .filter(Forecast.forecast_date >= date.today())
    )

    if product_ids:
        ids = [int(x.strip()) for x in product_ids.split(",") if x.strip().isdigit()]
        query = query.filter(Forecast.product_id.in_(ids))

    rows = query.order_by(Product.stock_code, Forecast.forecast_date).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "stock_code", "description", "model", "forecast_date",
        "predicted_quantity", "lower_bound_95", "upper_bound_95"
    ])
    for row in rows:
        writer.writerow([
            row.stock_code, row.description, row.model_name,
            row.forecast_date, round(float(row.predicted_quantity), 2),
            round(float(row.lower_bound), 2) if row.lower_bound else "",
            round(float(row.upper_bound), 2) if row.upper_bound else "",
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=retailiq_forecasts.csv"},
    )


@router.get("/alerts")
def export_alerts_csv(db: Session = Depends(get_db)):
    """Export all active inventory alerts as CSV."""
    from app.models.alert import InventoryAlert
    from app.models.product import Product
    import csv

    rows = (
        db.query(
            InventoryAlert.alert_type,
            InventoryAlert.severity,
            InventoryAlert.message,
            InventoryAlert.reorder_qty,
            InventoryAlert.reorder_point,
            InventoryAlert.current_velocity,
            InventoryAlert.created_at,
            Product.stock_code,
            Product.description,
        )
        .join(Product, InventoryAlert.product_id == Product.id)
        .filter(InventoryAlert.is_resolved == False)
        .order_by(InventoryAlert.severity.desc(), InventoryAlert.created_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "stock_code", "description", "alert_type", "severity",
        "message", "reorder_qty", "reorder_point", "current_velocity", "created_at"
    ])
    for row in rows:
        writer.writerow([
            row.stock_code, row.description, row.alert_type, row.severity,
            row.message, row.reorder_qty, row.reorder_point,
            row.current_velocity, row.created_at,
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=retailiq_alerts.csv"},
    )
