import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import date

from app.repositories.product_repo import ProductRepository
from app.repositories.transaction_repo import TransactionRepository
from app.repositories.alert_repo import AlertRepository
from app.models.product import Product
from app.models.daily_sales import DailySales
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self.product_repo = ProductRepository(db)
        self.transaction_repo = TransactionRepository(db)
        self.alert_repo = AlertRepository(db)

    def get_kpis(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> dict:
        """Compute core dashboard KPIs."""
        from app.models.transaction import Transaction
        from sqlalchemy import func

        q = self.db.query(Transaction).filter(Transaction.quantity > 0)
        if start_date:
            q = q.filter(Transaction.invoice_date >= start_date)
        if end_date:
            q = q.filter(Transaction.invoice_date <= end_date)

        agg = self.db.query(
            func.sum(Transaction.revenue).label("total_revenue"),
            func.count(Transaction.id).label("total_transactions"),
            func.avg(Transaction.revenue).label("avg_order_value"),
            func.count(Transaction.id.distinct()).label("unique_invoices"),
        ).filter(Transaction.quantity > 0)

        if start_date:
            agg = agg.filter(Transaction.invoice_date >= start_date)
        if end_date:
            agg = agg.filter(Transaction.invoice_date <= end_date)

        row = agg.first()

        # Return count
        return_q = self.db.query(func.count(Transaction.id)).filter(Transaction.is_return == True)
        return_count = return_q.scalar() or 0
        total_count = row.total_transactions or 1

        # Date range
        date_agg = self.db.query(
            func.min(Transaction.invoice_date),
            func.max(Transaction.invoice_date),
        ).first()

        # Top country
        country_row = (
            self.db.query(Transaction.country, func.count(Transaction.id).label("cnt"))
            .group_by(Transaction.country)
            .order_by(func.count(Transaction.id).desc())
            .first()
        )

        total_revenue = float(row.total_revenue or 0)
        date_min = date_agg[0].date() if date_agg[0] else None
        date_max = date_agg[1].date() if date_agg[1] else None
        date_range_days = (date_agg[1] - date_agg[0]).days + 1 if date_agg[0] and date_agg[1] else 1

        total_products = self.db.query(func.count(Product.id)).scalar() or 0

        return {
            "total_revenue": total_revenue,
            "total_transactions": int(row.total_transactions or 0),
            "total_products": int(total_products),
            "avg_daily_revenue": total_revenue / date_range_days,
            "avg_order_value": float(row.avg_order_value or 0),
            "return_rate_pct": round(return_count / total_count * 100, 2),
            "top_country": country_row[0] if country_row else None,
            "date_range_start": date_min,
            "date_range_end": date_max,
        }

    def compute_abc_analysis(self) -> dict:
        """
        ABC Analysis: Pareto principle applied to product revenue.
        A = top 80% of revenue, B = next 15%, C = remaining 5%.
        Updates products.abc_class in the database.
        """
        sql = text("""
            SELECT
                p.id,
                p.stock_code,
                p.description,
                SUM(t.revenue) AS total_revenue
            FROM products p
            JOIN transactions t ON t.product_id = p.id
            WHERE t.is_return = FALSE AND t.quantity > 0
            GROUP BY p.id, p.stock_code, p.description
            ORDER BY total_revenue DESC
        """)
        rows = self.db.execute(sql).fetchall()

        if not rows:
            return {"A": [], "B": [], "C": [], "summary": {}}

        total_rev = sum(float(r[3]) for r in rows)
        cumulative = 0.0
        result = {"A": [], "B": [], "C": []}
        updates = []

        for row in rows:
            rev = float(row[3])
            cumulative += rev
            cumulative_pct = (cumulative / total_rev) * 100 if total_rev else 0

            if cumulative_pct <= 80:
                abc = "A"
            elif cumulative_pct <= 95:
                abc = "B"
            else:
                abc = "C"

            item = {
                "product_id": row[0],
                "stock_code": row[1],
                "description": row[2],
                "abc_class": abc,
                "total_revenue": rev,
                "revenue_pct": round(rev / total_rev * 100, 4) if total_rev else 0,
                "cumulative_pct": round(cumulative_pct, 2),
            }
            result[abc].append(item)
            updates.append({"id": row[0], "abc_class": abc})

        # Bulk update abc_class
        if updates:
            for u in updates:
                self.db.query(Product).filter(Product.id == u["id"]).update(
                    {"abc_class": u["abc_class"]}
                )
            self.db.commit()

        summary = {
            cls: {
                "count": len(items),
                "revenue_pct": round(sum(i["revenue_pct"] for i in items), 1),
            }
            for cls, items in result.items()
        }

        logger.info(
            f"ABC analysis complete: A={len(result['A'])}, B={len(result['B'])}, C={len(result['C'])} products"
        )
        return {**result, "summary": summary}

    def get_slow_movers(self, threshold_days: int = 30) -> list:
        """
        Detect slow-moving products using IQR on 30-day sales velocity.
        Products below Q1 - 1.5*IQR are flagged as slow movers.
        """
        sql = text(f"""
            SELECT
                p.id,
                p.stock_code,
                p.description,
                CAST(AVG(ds.total_quantity) AS FLOAT) AS avg_30d_sales,
                MAX(ds.sale_date) AS last_sale_date
            FROM products p
            JOIN daily_sales ds ON ds.product_id = p.id
            WHERE ds.sale_date >= date('now', '-{threshold_days} days')
            GROUP BY p.id, p.stock_code, p.description
        """)
        rows = self.db.execute(sql).fetchall()

        if not rows:
            return []

        velocities = np.array([float(r[3]) for r in rows])
        q1 = np.percentile(velocities, 25)
        q3 = np.percentile(velocities, 75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr

        results = []
        today = date.today()
        for row, vel in zip(rows, velocities):
            if vel <= lower_bound:
                last_sale = row[4]
                days_since = (today - last_sale).days if last_sale else None

                severity = "high" if vel == 0 else ("medium" if vel < lower_bound / 2 else "low")
                results.append({
                    "product_id": row[0],
                    "stock_code": row[1],
                    "description": row[2],
                    "avg_30d_sales": round(vel, 4),
                    "threshold": round(float(lower_bound), 4),
                    "days_since_last_sale": days_since,
                    "severity": severity,
                })

        return sorted(results, key=lambda x: x["avg_30d_sales"])

    def get_revenue_trend(self, granularity: str = "daily") -> list:
        return self.transaction_repo.get_revenue_trend(granularity)

    def get_top_products(self, n: int = 10) -> list:
        return self.transaction_repo.get_top_products(n)
