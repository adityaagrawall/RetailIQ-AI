from app.config.database import Base
from sqlalchemy import (
    Column, Integer, Numeric, Date, DateTime,
    ForeignKey, func, Index
)
from sqlalchemy.orm import relationship


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    model_run_id = Column(Integer, ForeignKey("ml_runs.id"), nullable=False)
    forecast_date = Column(Date, nullable=False)
    predicted_quantity = Column(Numeric(10, 2), nullable=False)
    lower_bound = Column(Numeric(10, 2))   # 95% CI lower
    upper_bound = Column(Numeric(10, 2))   # 95% CI upper
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", backref="forecasts")
    model_run = relationship("MLRun", backref="forecasts")

    __table_args__ = (
        Index("ix_forecasts_product_date", "product_id", "forecast_date"),
    )
