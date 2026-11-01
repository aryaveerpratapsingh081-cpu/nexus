import os
import uuid
import shutil
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.voice_service import VoiceService, AUDIO_CACHE_DIR
from app.ai.orchestrator import AIOrchestrator
from app.schemas.chat import ChatRequest
from app.schemas.voice import (
    VoiceStatusResponse,
    TranscribeResponse,
    SpeakRequest,
    SpeakResponse,
    VoiceChatResponse
)

router = APIRouter(prefix="/voice", tags=["Voice"])

@router.get("/status", response_model=VoiceStatusResponse)
def get_voice_status():
    """Returns local offline STT and TTS readiness."""
    return VoiceService.get_status()

@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio_file(file: UploadFile = File(...)):
    """Transcribes uploaded audio recording using local Faster-Whisper."""
    if not file:
        raise HTTPException(status_code=400, detail="No audio file provided.")

    temp_id = f"upload_{uuid.uuid4().hex[:8]}"
    ext = Path(file.filename or "recording.wav").suffix or ".wav"
    temp_path = AUDIO_CACHE_DIR / f"{temp_id}{ext}"

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        text, lang = VoiceService.transcribe(str(temp_path))
        return TranscribeResponse(
            text=text,
            language=lang,
            success=True
        )
    except ValueError as e:
        raise HTTPException(status_code=413, detail=str(e))
    except Exception as e:
        return TranscribeResponse(
            text="",
            language="en",
            success=False,
            error=str(e)
        )
    finally:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass

@router.post("/speak", response_model=SpeakResponse)
def synthesize_speech_route(req: SpeakRequest):
    """Generates offline neural speech audio for given text with Kashish's voice."""
    try:
        res = VoiceService.synthesize_speech(req.text, req.rate, req.voice_id)
        return SpeakResponse(
            success=res.get("success", False),
            audio_base64=res.get("audio_base64"),
            duration_seconds=res.get("duration_seconds"),
            character_count=res.get("character_count", len(req.text)),
            error=res.get("error")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis error: {str(e)}")

@router.post("/chat", response_model=VoiceChatResponse)
async def voice_chat_turn(
    message: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    session_id: str = Form("default"),
    db: Session = Depends(get_db)
):
    """
    Seamless two-way voice turn:
    1. Transcribes incoming audio if provided (or uses text).
    2. Runs prompt through Kashish personality + Ollama qwen3:4b with tool execution.
    3. Synthesizes voice audio response.
    4. Returns transcript, text response, tool execution logs, and audio payload.
    """
    user_prompt = message or ""

    # 1. Transcribe audio if uploaded
    if audio_file:
        temp_id = f"turn_{uuid.uuid4().hex[:8]}"
        ext = Path(audio_file.filename or "recording.wav").suffix or ".wav"
        temp_path = AUDIO_CACHE_DIR / f"{temp_id}{ext}"

        try:
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(audio_file.file, buffer)
            transcribed_text, _ = VoiceService.transcribe(str(temp_path))
            if transcribed_text.strip():
                user_prompt = transcribed_text.strip()
        except Exception as e:
            # If transcription fails, check if text message was also provided
            if not user_prompt:
                return VoiceChatResponse(
                    transcript="",
                    response=f"I couldn't hear that clearly. Could you please repeat? (Transcription notice: {str(e)})",
                    audio_base64=None,
                    tool_executions=[],
                    session_id=session_id
                )
        finally:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except Exception:
                    pass

    if not user_prompt.strip():
        return VoiceChatResponse(
            transcript="",
            response="I didn't catch that. Please press the microphone and speak again!",
            audio_base64=None,
            tool_executions=[],
            session_id=session_id
        )

    # 2. Invoke AI Orchestrator with Kashish persona and tools
    chat_req = ChatRequest(
        message=user_prompt,
        session_id=session_id,
        include_history=True
    )
    chat_res = await AIOrchestrator.process_chat(chat_req, db)

    # 3. Synthesize speech for Kashish's spoken response
    tts_res = VoiceService.synthesize_speech(chat_res.response)

    return VoiceChatResponse(
        transcript=user_prompt,
        response=chat_res.response,
        audio_base64=tts_res.get("audio_base64"),
        tool_executions=[l.model_dump() for l in chat_res.tool_executions],
        session_id=session_id,
        thinking=chat_res.thinking
    )

@router.post("/stop")
def stop_speaking():
    """Immediately cancels ongoing speech playback."""
    return {"status": "stopped", "message": "Playback cancelled."}

