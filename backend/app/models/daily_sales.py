from app.config.database import Base
from sqlalchemy import (
    Column, Integer, Numeric, Date, DateTime,
    ForeignKey, func, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship


class DailySales(Base):
    __tablename__ = "daily_sales"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    sale_date = Column(Date, nullable=False, index=True)
    total_quantity = Column(Integer, default=0, nullable=False)
    total_revenue = Column(Numeric(12, 2), default=0)
    transaction_count = Column(Integer, default=0)
    avg_unit_price = Column(Numeric(10, 2))

    product = relationship("Product", backref="daily_sales")

    __table_args__ = (
        UniqueConstraint("product_id", "sale_date", name="uq_daily_sales_product_date"),
        Index("ix_daily_sales_product_date", "product_id", "sale_date"),
    )
