from app.config.database import Base
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, func


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    stock_code = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(Text)
    category = Column(String(100), index=True)
    abc_class = Column(String(1), index=True)  # 'A', 'B', or 'C'
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Product(stock_code={self.stock_code}, description={self.description[:30] if self.description else ''})>"
