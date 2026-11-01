from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_backend_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "Nexus AI OS"
    assert "timestamp" in data

