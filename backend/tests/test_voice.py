import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.voice_service import VoiceService

client = TestClient(app)

def test_voice_status_endpoint():
    response = client.get("/api/voice/status")
    assert response.status_code == 200
    data = response.json()
    assert "stt_available" in data
    assert "tts_available" in data
    assert data["tts_available"] is True
    assert "current_voice" in data
    assert data["speech_rate"] == 175

def test_text_cleaning_for_speech():
    raw = "# Header\nHello **world**! Visit https://example.com. Here is `code`.\n```python\nprint(1)\n```"
    cleaned = VoiceService._clean_text_for_speech(raw)
    assert "**" not in cleaned
    assert "https://" not in cleaned
    assert "#" not in cleaned
    assert "Hello world!" in cleaned

def test_speech_synthesis_service():
    res = VoiceService.synthesize_speech("Hey! I'm Kashish, your personal AI assistant.")
    assert res["success"] is True
    assert res["audio_base64"] is not None
    assert res["audio_base64"].startswith("data:audio/wav;base64,")
    assert res["duration_seconds"] > 0

def test_speak_endpoint():
    response = client.post("/api/voice/speak", json={"text": "Kashish is ready to help you.", "rate": 175})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["audio_base64"] is not None

def test_stop_speaking_endpoint():
    response = client.post("/api/voice/stop")
    assert response.status_code == 200
    assert response.json()["status"] == "stopped"

