from app.config.database import Base
from sqlalchemy import (
    Column, Integer, String, Numeric, DateTime, Boolean,
    ForeignKey, func, Index
)
from sqlalchemy.orm import relationship


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    invoice_no = Column(String(20), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    revenue = Column(Numeric(12, 2))  # Computed: quantity * unit_price
    invoice_date = Column(DateTime(timezone=True), nullable=False, index=True)
    customer_id = Column(String(20), index=True)
    country = Column(String(100))
    is_return = Column(Boolean, default=False, nullable=False)
    upload_id = Column(Integer, ForeignKey("uploads.id"), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", backref="transactions")
    upload = relationship("Upload", backref="transactions")

    __table_args__ = (
        Index("ix_transactions_product_date", "product_id", "invoice_date"),
    )
