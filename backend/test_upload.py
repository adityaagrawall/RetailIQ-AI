from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
try:
    response = client.get("/api/v1/upload/1/status")
    print(response.status_code)
    print(response.text)
except Exception as e:
    import traceback
    traceback.print_exc()
