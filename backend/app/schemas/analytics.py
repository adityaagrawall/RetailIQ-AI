from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# ---- Product Schemas ----

class ProductBase(BaseModel):
    stock_code: str
    description: Optional[str] = None
    category: Optional[str] = None
    abc_class: Optional[str] = None
    current_stock: int = 0
    lead_time_days: int = 7
    safety_stock: int = 0
    unit_cost: float = 0.0
    is_active: bool = True


class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ProductSummary(BaseModel):
    """Lightweight product card for lists/tables."""
    id: int
    stock_code: str
    description: Optional[str]
    abc_class: Optional[str]
    current_stock: int
    lead_time_days: int
    safety_stock: int
    total_revenue: Optional[float]
    total_quantity: Optional[int]
    avg_daily_sales: Optional[float]
    last_sale_date: Optional[date]

    model_config = {"from_attributes": True}


class PaginatedProducts(BaseModel):
    data: List[ProductSummary]
    total: int
    page: int
    limit: int
    pages: int


# ---- Analytics / KPI Schemas ----

class KPIResponse(BaseModel):
    total_revenue: float
    total_transactions: int
    total_products: int
    avg_daily_revenue: float
    avg_order_value: float
    return_rate_pct: float
    top_country: Optional[str]
    date_range_start: Optional[date]
    date_range_end: Optional[date]


# Removed unused schemas for simplicity


# ---- Alert Schemas ----

class AlertResponse(BaseModel):
    id: int
    product_id: int
    stock_code: Optional[str]
    description: Optional[str]
    alert_type: str
    severity: str
    message: str
    reorder_qty: Optional[int]
    reorder_point: Optional[float]
    current_velocity: Optional[float]
    is_resolved: bool
    created_at: datetime
    resolved_at: Optional[datetime]

    model_config = {"from_attributes": True}


class DailySalesPoint(BaseModel):
    sale_date: date
    total_quantity: int
    total_revenue: float
    transaction_count: int
    avg_unit_price: Optional[float]
