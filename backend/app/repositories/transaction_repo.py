from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List, Optional
from datetime import date
import pandas as pd

from app.models.transaction import Transaction
from app.models.daily_sales import DailySales
from app.models.product import Product


class TransactionRepository:
    def __init__(self, db: Session):
        self.db = db

    def bulk_insert_from_dataframe(self, df: pd.DataFrame, upload_id: int, product_map: dict) -> int:
        """
        Bulk insert transactions from validated DataFrame.
        product_map: {stock_code: product_id}
        Returns count of inserted rows.
        """
        records = []
        for _, row in df.iterrows():
            stock_code = str(row["StockCode"]).strip()
            product_id = product_map.get(stock_code)
            if not product_id:
                continue

            revenue = float(row["Quantity"]) * float(row["Price"])
            records.append({
                "invoice_no": str(row["InvoiceNo"])[:20],
                "product_id": product_id,
                "quantity": int(row["Quantity"]),
                "unit_price": float(row["Price"]),
                "revenue": revenue,
                "invoice_date": row["InvoiceDate"],
                "customer_id": str(row.get("Customer ID", ""))[:20] or None,
                "country": str(row.get("Country", ""))[:100] or None,
                "is_return": bool(row.get("is_return", False)),
                "upload_id": upload_id,
            })

        if records:
            # Use core insert for bulk performance
            self.db.execute(Transaction.__table__.insert(), records)
            self.db.commit()

        return len(records)

    def aggregate_daily_sales(self, upload_id: int):
        """
        Aggregate transactions into daily_sales table after upload.
        Uses SQL aggregation for performance.
        """
        agg_sql = text("""
            INSERT INTO daily_sales (product_id, sale_date, total_quantity, total_revenue, transaction_count, avg_unit_price)
            SELECT
                t.product_id,
                DATE(t.invoice_date) AS sale_date,
                SUM(t.quantity)           AS total_quantity,
                SUM(t.revenue)            AS total_revenue,
                COUNT(*)                  AS transaction_count,
                AVG(t.unit_price)         AS avg_unit_price
            FROM transactions t
            WHERE t.upload_id = :upload_id
              AND t.is_return = FALSE
              AND t.quantity > 0
            GROUP BY t.product_id, DATE(t.invoice_date)
            ON CONFLICT (product_id, sale_date)
            DO UPDATE SET
                total_quantity    = daily_sales.total_quantity + EXCLUDED.total_quantity,
                total_revenue     = daily_sales.total_revenue + EXCLUDED.total_revenue,
                transaction_count = daily_sales.transaction_count + EXCLUDED.transaction_count,
                avg_unit_price    = EXCLUDED.avg_unit_price
        """)
        self.db.execute(agg_sql, {"upload_id": upload_id})
        self.db.commit()

    def get_kpis(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> dict:
        query = self.db.query(
            func.sum(Transaction.revenue).label("total_revenue"),
            func.count(Transaction.id).label("total_transactions"),
            func.avg(Transaction.revenue).label("avg_order_value"),
            func.sum(
                func.cast(Transaction.is_return, Integer) if False else
                func.case((Transaction.is_return == True, 1), else_=0)
            ).label("return_count"),
        ).filter(Transaction.quantity > 0)

        if start_date:
            query = query.filter(Transaction.invoice_date >= start_date)
        if end_date:
            query = query.filter(Transaction.invoice_date <= end_date)

        result = query.first()
        return {
            "total_revenue": float(result.total_revenue or 0),
            "total_transactions": int(result.total_transactions or 0),
            "avg_order_value": float(result.avg_order_value or 0),
            "return_count": int(result.return_count or 0),
        }

    def get_revenue_trend(self, granularity: str = "daily") -> List[dict]:
        """Return revenue aggregated by day/week/month."""
        if granularity == "weekly":
            trunc = "week"
        elif granularity == "monthly":
            trunc = "month"
        else:
            trunc = "day"

        sql = text(f"""
            SELECT
                DATE_TRUNC('{trunc}', invoice_date)::DATE AS period,
                SUM(revenue)                              AS revenue,
                SUM(quantity)                             AS quantity,
                COUNT(*)                                  AS transaction_count
            FROM transactions
            WHERE is_return = FALSE AND quantity > 0
            GROUP BY period
            ORDER BY period
        """)
        rows = self.db.execute(sql).fetchall()
        return [
            {
                "period": str(row[0]),
                "revenue": float(row[1] or 0),
                "quantity": int(row[2] or 0),
                "transaction_count": int(row[3] or 0),
            }
            for row in rows
        ]

    def get_top_products(self, n: int = 10) -> List[dict]:
        sql = text("""
            SELECT
                p.id,
                p.stock_code,
                p.description,
                p.abc_class,
                SUM(t.revenue)   AS total_revenue,
                SUM(t.quantity)  AS total_quantity,
                RANK() OVER (ORDER BY SUM(t.revenue) DESC) AS rank
            FROM transactions t
            JOIN products p ON p.id = t.product_id
            WHERE t.is_return = FALSE AND t.quantity > 0
            GROUP BY p.id, p.stock_code, p.description, p.abc_class
            ORDER BY total_revenue DESC
            LIMIT :n
        """)
        rows = self.db.execute(sql, {"n": n}).fetchall()
        return [
            {
                "rank": int(row[6]),
                "product_id": row[0],
                "stock_code": row[1],
                "description": row[2],
                "abc_class": row[3],
                "total_revenue": float(row[4] or 0),
                "total_quantity": int(row[5] or 0),
            }
            for row in rows
        ]
