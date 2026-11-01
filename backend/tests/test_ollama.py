import pytest
from app.ai.ollama_client import OllamaClient

@pytest.mark.asyncio
async def test_ollama_unavailable_state():
    # Ping non-existent port
    res = await OllamaClient.get_status(endpoint="http://127.0.0.1:59999", selected_model="fake_model:latest")
    assert res.is_available is False
    assert res.is_selected_model_available is False
    assert res.troubleshooting_guide is not None
    assert "Cannot connect" in res.error_message or "Ensure Ollama is installed" in res.troubleshooting_guide

@pytest.mark.asyncio
async def test_model_unavailable_state():
    # Real or default endpoint with non-existent model
    res = await OllamaClient.get_status(endpoint="http://127.0.0.1:11434", selected_model="definitely_nonexistent_model_xyz:999b")
    # If Ollama is running, is_available will be True, but is_selected_model_available will be False
    if res.is_available:
        assert res.is_selected_model_available is False
        assert "not found" in res.troubleshooting_guide or "not installed" in res.error_message
    else:
        assert res.is_available is False

