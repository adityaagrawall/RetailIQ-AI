from app.config.database import Base
from sqlalchemy import (
    Column, Integer, String, Numeric, DateTime,
    Text, JSON, func
)


class MLRun(Base):
    __tablename__ = "ml_runs"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(50), nullable=False, index=True)  # 'prophet', 'xgboost'
    model_version = Column(String(20), default="1.0.0")
    training_start = Column(DateTime(timezone=True))
    training_end = Column(DateTime(timezone=True))
    products_trained = Column(Integer, default=0)
    mae = Column(Numeric(10, 4))
    rmse = Column(Numeric(10, 4))
    mape = Column(Numeric(10, 4))
    parameters = Column(JSON)            # Store hyperparameters as JSON
    artifact_path = Column(Text)         # Path to saved model file
    status = Column(String(20), default="pending", index=True)  # pending/running/completed/failed
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<MLRun(model={self.model_name}, status={self.status}, mape={self.mape})>"
