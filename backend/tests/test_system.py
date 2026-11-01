from app.services.system_service import SystemService
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_system_stats_service():
    stats = SystemService.get_system_stats()
    assert stats.cpu.usage_percent >= 0.0
    assert stats.cpu.core_count >= 1
    assert stats.memory.total_bytes > 0
    assert stats.memory.total_gb > 0
    assert len(stats.disks) >= 1
    assert stats.platform != ""

def test_system_stats_endpoint():
    response = client.get("/api/system/stats")
    assert response.status_code == 200
    data = response.json()
    assert "cpu" in data
    assert "memory" in data
    assert "disks" in data
    assert data["memory"]["total_gb"] > 0

