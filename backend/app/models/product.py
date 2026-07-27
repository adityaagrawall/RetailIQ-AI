from app.config.database import Base
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, func


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    stock_code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text)
    category = Column(String(100), index=True)
    abc_class = Column(String(1), index=True)  # 'A', 'B', or 'C'
    
    # Authentic Inventory Management Fields
    current_stock = Column(Integer, default=0, nullable=False)
    lead_time_days = Column(Integer, default=7, nullable=False)
    safety_stock = Column(Integer, default=0, nullable=False)
    unit_cost = Column(Float, default=0.0, nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Product(stock_code={self.stock_code}, stock={self.current_stock})>"
