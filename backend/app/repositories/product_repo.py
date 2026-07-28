from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
from typing import Optional, List
from datetime import date
import pandas as pd

from app.models.product import Product
from app.models.daily_sales import DailySales
from app.models.transaction import Transaction


class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(
        self,
        page: int = 1,
        limit: int = 50,
        abc_class: Optional[str] = None,
        search: Optional[str] = None,
    ) -> tuple[List[dict], int]:
        query = (
            self.db.query(
                Product,
                func.sum(DailySales.total_revenue).label("total_revenue"),
                func.sum(DailySales.total_quantity).label("total_quantity"),
                func.avg(DailySales.total_quantity).label("avg_daily_sales"),
                func.max(DailySales.sale_date).label("last_sale_date"),
            )
            .join(DailySales, Product.id == DailySales.product_id)
            .group_by(Product.id)
        )

        if abc_class:
            query = query.filter(Product.abc_class == abc_class.upper())

        if search:
            query = query.filter(
                Product.stock_code.ilike(f"%{search}%") |
                Product.description.ilike(f"%{search}%")
            )

        total = query.count()

        results = (
            query
            .order_by(desc("total_revenue"))
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )

        products = []
        for row in results:
            p = row[0]
            products.append({
                "id": p.id,
                "stock_code": p.stock_code,
                "description": p.description,
                "abc_class": p.abc_class,
                "current_stock": p.current_stock,
                "lead_time_days": p.lead_time_days,
                "safety_stock": p.safety_stock,
                "total_revenue": float(row[1] or 0),
                "total_quantity": int(row[2] or 0),
                "avg_daily_sales": float(row[3] or 0),
                "last_sale_date": row[4],
            })

        return products, total

    def get_by_id(self, product_id: int) -> Optional[Product]:
        return self.db.query(Product).filter(Product.id == product_id).first()

    def get_by_stock_code(self, stock_code: str) -> Optional[Product]:
        return self.db.query(Product).filter(Product.stock_code == stock_code).first()

    def upsert_from_dataframe(self, df: pd.DataFrame) -> int:
        """Insert new products from validated upload dataframe. Returns count inserted."""
        existing_codes = {
            row[0] for row in self.db.query(Product.stock_code).all()
        }
        import numpy as np
        new_products = []
        seen = set()
        for _, row in df.iterrows():
            code = str(row["StockCode"]).strip()
            if code not in existing_codes and code not in seen:
                seen.add(code)
                
                # Simulate authentic supply chain data for MVP
                unit_price = float(row.get("Price", 0.0))
                # Lead time between 3 and 21 days (gamma distributed)
                lead_time = int(np.clip(np.random.gamma(shape=5.0, scale=2.0), 3, 21))
                # Assume current stock covers between 5 and 60 days of sales (randomized)
                # Since we don't have sales rate yet, just do a random baseline
                current_stock = int(np.random.lognormal(mean=4.0, sigma=1.0))
                # Safety stock is usually 10-30% of standard deviation over lead time, we'll mock
                safety = int(current_stock * np.random.uniform(0.1, 0.4))
                
                new_products.append(Product(
                    stock_code=code,
                    description=str(row.get("Description", "")).strip()[:500] or None,
                    current_stock=current_stock,
                    lead_time_days=lead_time,
                    safety_stock=safety,
                    unit_cost=max(0.1, unit_price * 0.4) # Assume 60% gross margin
                ))
        if new_products:
            self.db.add_all(new_products)
            self.db.commit()
        return len(new_products)

    def get_daily_sales(
        self,
        product_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[DailySales]:
        query = self.db.query(DailySales).filter(DailySales.product_id == product_id)
        if start_date:
            query = query.filter(DailySales.sale_date >= start_date)
        if end_date:
            query = query.filter(DailySales.sale_date <= end_date)
        return query.order_by(DailySales.sale_date).all()

    def update_abc_class(self, product_id: int, abc_class: str):
        self.db.query(Product).filter(Product.id == product_id).update(
            {"abc_class": abc_class}
        )
