import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.repositories.product_repo import ProductRepository
from app.schemas.analytics import ProductSummary, PaginatedProducts, DailySalesPoint
from datetime import date

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=PaginatedProducts)
def list_products(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    abc_class: Optional[str] = Query(None, pattern="^[ABCabc]$"),
    search: Optional[str] = Query(None, max_length=100),
    db: Session = Depends(get_db),
):
    """List all products with sales summary, filterable by ABC class and search."""
    repo = ProductRepository(db)
    products, total = repo.get_all(
        page=page,
        limit=limit,
        abc_class=abc_class,
        search=search,
    )
    return {
        "data": products,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit),
    }


@router.get("/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get detailed information about a single product."""
    repo = ProductRepository(db)
    product = repo.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")

    # Include sales summary
    from app.models.daily_sales import DailySales
    from sqlalchemy import func

    agg = (
        db.query(
            func.sum(DailySales.total_revenue).label("total_revenue"),
            func.sum(DailySales.total_quantity).label("total_quantity"),
            func.avg(DailySales.total_quantity).label("avg_daily_sales"),
            func.max(DailySales.sale_date).label("last_sale_date"),
            func.count(DailySales.id).label("active_days"),
        )
        .filter(DailySales.product_id == product_id)
        .first()
    )

    return {
        "id": product.id,
        "stock_code": product.stock_code,
        "description": product.description,
        "category": product.category,
        "abc_class": product.abc_class,
        "is_active": product.is_active,
        "created_at": product.created_at,
        "summary": {
            "total_revenue": float(agg.total_revenue or 0),
            "total_quantity": int(agg.total_quantity or 0),
            "avg_daily_sales": float(agg.avg_daily_sales or 0),
            "last_sale_date": agg.last_sale_date,
            "active_days": int(agg.active_days or 0),
        },
    }


@router.get("/{product_id}/sales")
def get_product_sales(
    product_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Get daily sales history for a specific product."""
    repo = ProductRepository(db)
    product = repo.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")

    sales = repo.get_daily_sales(product_id, start_date, end_date)
    return [
        {
            "sale_date": s.sale_date,
            "total_quantity": s.total_quantity,
            "total_revenue": float(s.total_revenue or 0),
            "transaction_count": s.transaction_count,
            "avg_unit_price": float(s.avg_unit_price or 0),
        }
        for s in sales
    ]
