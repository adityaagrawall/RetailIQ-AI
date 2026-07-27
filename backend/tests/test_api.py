import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config.database import Base, get_db
from app.models.product import Product
from app.models.daily_sales import DailySales
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    # Seed mock product
    p = Product(
        stock_code="TEST1", 
        description="Test Product", 
        current_stock=50,
        lead_time_days=7,
        safety_stock=20,
        unit_cost=10.0
    )
    db.add(p)
    db.commit()
    
    # Seed sales
    db.add(DailySales(
        product_id=p.id,
        sale_date=date.today(),
        total_quantity=5,
        total_revenue=75.0,
        transaction_count=1
    ))
    db.commit()
    db.close()
    
    yield
    
    Base.metadata.drop_all(bind=engine)

def test_get_products():
    response = client.get("/api/v1/products")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert len(data["data"]) == 1
    
    product = data["data"][0]
    assert product["stock_code"] == "TEST1"
    assert product["current_stock"] == 50
    assert product["lead_time_days"] == 7
    assert product["safety_stock"] == 20
    assert product["total_quantity"] == 5

def test_get_product_by_id():
    response = client.get("/api/v1/products/1")
    assert response.status_code == 200
    data = response.json()
    assert data["stock_code"] == "TEST1"

def test_product_not_found():
    response = client.get("/api/v1/products/999")
    assert response.status_code == 404
