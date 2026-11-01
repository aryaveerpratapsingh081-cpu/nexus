from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class VoiceStatusResponse(BaseModel):
    stt_available: bool
    stt_engine: str
    stt_model: str
    tts_available: bool
    tts_engine: str
    current_voice: str
    speech_rate: int
    error_message: Optional[str] = None

class TranscribeResponse(BaseModel):
    text: str
    language: str = "en"
    duration_seconds: Optional[float] = None
    success: bool = True
    error: Optional[str] = None

class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    rate: Optional[int] = Field(175, ge=80, le=300)
    voice_id: Optional[str] = None

class SpeakResponse(BaseModel):
    success: bool
    audio_base64: Optional[str] = None
    duration_seconds: Optional[float] = None
    character_count: int
    error: Optional[str] = None

class VoiceChatResponse(BaseModel):
    transcript: str
    response: str
    audio_base64: Optional[str] = None
    tool_executions: List[Dict[str, Any]] = []
    session_id: str
    thinking: Optional[str] = None

