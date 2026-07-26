from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from app.models.alert import InventoryAlert


class AlertRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_alert(self, **kwargs) -> InventoryAlert:
        alert = InventoryAlert(**kwargs)
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        return alert

    def bulk_create(self, alerts: List[dict]):
        """Insert multiple alerts at once."""
        # Delete unresolved alerts before regenerating
        self.db.query(InventoryAlert).filter(InventoryAlert.is_resolved == False).delete()
        records = [InventoryAlert(**a) for a in alerts]
        self.db.add_all(records)
        self.db.commit()

    def get_all(
        self,
        alert_type: Optional[str] = None,
        severity: Optional[str] = None,
        is_resolved: Optional[bool] = False,
        limit: int = 100,
    ) -> List[dict]:
        from app.models.product import Product
        query = (
            self.db.query(InventoryAlert, Product.stock_code, Product.description)
            .join(Product, InventoryAlert.product_id == Product.id)
        )
        if alert_type:
            query = query.filter(InventoryAlert.alert_type == alert_type)
        if severity:
            query = query.filter(InventoryAlert.severity == severity)
        if is_resolved is not None:
            query = query.filter(InventoryAlert.is_resolved == is_resolved)

        results = query.order_by(
            desc(InventoryAlert.created_at)
        ).limit(limit).all()

        return [
            {
                **{c.name: getattr(row[0], c.name) for c in InventoryAlert.__table__.columns},
                "stock_code": row[1],
                "description": row[2],
            }
            for row in results
        ]

    def resolve(self, alert_id: int) -> Optional[InventoryAlert]:
        alert = self.db.query(InventoryAlert).filter(InventoryAlert.id == alert_id).first()
        if alert:
            alert.is_resolved = True
            alert.resolved_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(alert)
        return alert
