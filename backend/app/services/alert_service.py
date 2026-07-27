import math
import numpy as np
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.repositories.alert_repo import AlertRepository
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class AlertService:
    def __init__(self, db: Session):
        self.db = db
        self.alert_repo = AlertRepository(db)

    def generate_all_alerts(self) -> int:
        """
        Run full alert generation pipeline:
        1. Reorder point alerts
        2. Slow-mover alerts
        3. Stockout risk alerts

        Returns count of alerts created.
        """
        all_alerts = []

        all_alerts.extend(self._compute_reorder_alerts())
        all_alerts.extend(self._compute_stockout_risk_alerts())
        all_alerts.extend(self._compute_slow_mover_alerts())

        self.alert_repo.bulk_create(all_alerts)
        logger.info(f"Generated {len(all_alerts)} inventory alerts")
        return len(all_alerts)

    def _compute_reorder_alerts(self) -> List[dict]:
        """
        Reorder Point = (avg_daily_sales × lead_time) + safety_stock
        Safety Stock  = Z × σ_daily_sales × √lead_time
        """
        lead_time = settings.default_lead_time_days
        z = settings.safety_stock_z_score  # 1.65 = 95% service level

        from datetime import datetime, timedelta
        thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        sql = text("""
            SELECT 
                p.id, 
                AVG(ds.total_quantity)         AS avg_daily_sales,
                STDDEV(ds.total_quantity)      AS std_daily_sales,
                SUM(ds.total_quantity)         AS total_30d_sales
            FROM products p
            JOIN daily_sales ds ON ds.product_id = p.id
            WHERE ds.sale_date >= :thirty_days_ago
            GROUP BY p.id
            HAVING AVG(ds.total_quantity) > 0
        """)
        rows = self.db.execute(sql, {"thirty_days_ago": thirty_days_ago}).fetchall()

        alerts = []
        for row in rows:
            avg = float(row[1] or 0)
            std = float(row[2] or 0)
            reorder_point = (avg * lead_time) + (z * std * math.sqrt(lead_time))
            reorder_qty = max(1, round(avg * lead_time * 1.5))  # 1.5x lead time demand

            # Only alert if reorder point is meaningful
            if reorder_point < 1:
                continue

            severity = "high" if avg > 50 else ("medium" if avg > 10 else "low")

            alerts.append({
                "product_id": row[0],
                "alert_type": "reorder_needed",
                "severity": severity,
                "message": (
                    f"Reorder point reached: {round(reorder_point, 1)} units. "
                    f"Avg daily sales: {round(avg, 1)}, Lead time: {lead_time} days."
                ),
                "reorder_qty": reorder_qty,
                "reorder_point": round(reorder_point, 2),
                "current_velocity": round(avg, 4),
            })

        return alerts

    def _compute_stockout_risk_alerts(self) -> List[dict]:
        """Flag products with rapidly declining sales trend (potential stockout signal)."""
        from datetime import datetime, timedelta
        thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        seven_days_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        eight_days_ago = (datetime.now() - timedelta(days=8)).strftime('%Y-%m-%d')
        
        sql = text("""
            SELECT
                product_id,
                AVG(CASE WHEN sale_date >= :seven_days_ago
                         THEN total_quantity END) AS recent_7d_avg,
                AVG(CASE WHEN sale_date BETWEEN :thirty_days_ago
                                              AND :eight_days_ago
                         THEN total_quantity END) AS prior_avg
            FROM daily_sales
            WHERE sale_date >= :thirty_days_ago
            GROUP BY product_id
            HAVING
                AVG(CASE WHEN sale_date >= :seven_days_ago
                         THEN total_quantity END) IS NOT NULL
                AND AVG(CASE WHEN sale_date BETWEEN :thirty_days_ago
                                               AND :eight_days_ago
                         THEN total_quantity END) > 0
        """)
        rows = self.db.execute(sql, {
            "thirty_days_ago": thirty_days_ago,
            "seven_days_ago": seven_days_ago,
            "eight_days_ago": eight_days_ago
        }).fetchall()

        alerts = []
        for row in rows:
            recent = float(row[1] or 0)
            prior = float(row[2] or 0)
            if prior == 0:
                continue
            decline_pct = (prior - recent) / prior * 100
            if decline_pct > 50:  # Sales dropped more than 50% in last 7 days
                alerts.append({
                    "product_id": row[0],
                    "alert_type": "stockout_risk",
                    "severity": "high" if decline_pct > 75 else "medium",
                    "message": (
                        f"Sales declined {round(decline_pct, 1)}% in the last 7 days "
                        f"(from {round(prior, 1)} to {round(recent, 1)} avg daily units). "
                        f"Possible stockout or demand shift."
                    ),
                    "current_velocity": round(recent, 4),
                })

        return alerts

    def _compute_slow_mover_alerts(self) -> List[dict]:
        """Use IQR to flag slow-moving products."""
        from datetime import datetime, timedelta
        thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        sql = text("""
            SELECT
                product_id,
                CAST(AVG(total_quantity) AS FLOAT) AS avg_qty
            FROM daily_sales
            WHERE sale_date >= :thirty_days_ago
            GROUP BY product_id
        """)
        rows = self.db.execute(sql, {"thirty_days_ago": thirty_days_ago}).fetchall()
        if not rows:
            return []

        velocities = np.array([float(r[1]) for r in rows])
        q1 = np.percentile(velocities, 25)
        q3 = np.percentile(velocities, 75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr

        alerts = []
        for row, vel in zip(rows, velocities):
            if vel <= lower_bound:
                severity = "high" if vel == 0 else "medium"
                alerts.append({
                    "product_id": row[0],
                    "alert_type": "slow_mover",
                    "severity": severity,
                    "message": (
                        f"Slow-moving product: avg daily sales of {round(vel, 2)} units "
                        f"is below threshold of {round(float(lower_bound), 2)} units. "
                        f"Consider promotions or markdown."
                    ),
                    "current_velocity": round(vel, 4),
                })

        return alerts
