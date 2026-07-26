from app.config.database import Base
from sqlalchemy import (
    Column, Integer, String, Numeric, DateTime,
    Boolean, Text, ForeignKey, func, Index
)
from sqlalchemy.orm import relationship


class InventoryAlert(Base):
    __tablename__ = "inventory_alerts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False, index=True)
    # Types: 'reorder_needed', 'slow_mover', 'stockout_risk', 'anomaly'
    severity = Column(String(20), nullable=False, index=True)
    # Severity: 'low', 'medium', 'high'
    message = Column(Text, nullable=False)
    reorder_qty = Column(Integer)
    reorder_point = Column(Numeric(10, 2))
    current_velocity = Column(Numeric(10, 4))   # avg daily sales
    is_resolved = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True))

    product = relationship("Product", backref="alerts")

    __table_args__ = (
        Index("ix_alerts_product_resolved", "product_id", "is_resolved"),
    )
