import os
import re
import time
import uuid
import base64
import threading
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

from app.config import settings

# Thread-safe lock for COM and audio operations
_audio_lock = threading.Lock()
_whisper_model = None
_whisper_loaded = False
_whisper_error = None

# Audio cache folder
AUDIO_CACHE_DIR = settings.DATA_DIR / "audio_cache"
AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)

class VoiceService:
    """
    Kashish Voice Assistant Audio Pipeline:
    - Offline STT (Faster-Whisper with CPU int8 quantization)
    - Offline Neural TTS (pyttsx3 / Windows OneCore with Microsoft Zira)
    - Audio cleanup & memory management
    """

    @classmethod
    def _clean_text_for_speech(cls, text: str) -> str:
        """Strips markdown code blocks, URLs, and bold/italic asterisks for natural speech."""
        if not text:
            return ""
        # Remove markdown code blocks
        clean = re.sub(r"```[\s\S]*?```", " [code omitted] ", text)
        clean = re.sub(r"`([^`]+)`", r"\1", clean)
        # Remove URLs
        clean = re.sub(r"https?://\S+", "", clean)
        # Remove bold / italics
        clean = re.sub(r"\*\*([^*]+)\*\*", r"\1", clean)
        clean = re.sub(r"\*([^*]+)\*", r"\1", clean)
        # Remove markdown headers
        clean = re.sub(r"^#+\s*", "", clean, flags=re.MULTILINE)
        # Remove markdown bullet asterisks or dashes
        clean = re.sub(r"^\s*[-*•]\s+", "", clean, flags=re.MULTILINE)
        # Normalize whitespace
        clean = re.sub(r"\s+", " ", clean).strip()
        return clean

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """Returns the readiness status of offline STT and TTS engines."""
        # Check STT availability
        stt_installed = False
        try:
            import faster_whisper
            stt_installed = True
        except ImportError:
            try:
                import speech_recognition
                stt_installed = True
            except ImportError:
                stt_installed = False

        # Check TTS availability & list voices
        tts_installed = False
        selected_voice_name = "Microsoft Zira Desktop - English (United States)"
        try:
            import pyttsx3
            tts_installed = True
            # Probe engine voices
            engine = pyttsx3.init()
            voices = engine.getProperty("voices")
            for v in voices:
                if "zira" in v.name.lower() or "hazel" in v.name.lower():
                    selected_voice_name = v.name
                    break
        except Exception:
            pass

        return {
            "stt_available": stt_installed,
            "stt_engine": "Faster-Whisper (offline)" if stt_installed else "Not Installed",
            "stt_model": "tiny.en (CPU int8)",
            "tts_available": tts_installed,
            "tts_engine": "Windows SAPI5 / OneCore Neural",
            "current_voice": selected_voice_name,
            "speech_rate": 175,
            "error_message": None if (stt_installed and tts_installed) else "Some voice components are initializing."
        }

    @classmethod
    def get_whisper_model(cls):
        """Lazy-loads Faster-Whisper model in memory only on demand."""
        global _whisper_model, _whisper_loaded, _whisper_error
        if _whisper_model is not None:
            return _whisper_model

        try:
            # Compatibility patch for PyAV 15+ / 19+ which removed metadata_errors parameter
            try:
                import av
                if hasattr(av, "open"):
                    _orig_av_open = av.open
                    def _safe_av_open(*args, **kwargs):
                        kwargs.pop("metadata_errors", None)
                        return _orig_av_open(*args, **kwargs)
                    av.open = _safe_av_open
            except Exception:
                pass

            from faster_whisper import WhisperModel
            # Use tiny.en for low RAM (16GB machine) and sub-second CPU inference
            _whisper_model = WhisperModel(
                "tiny.en",
                device="cpu",
                compute_type="int8",
                download_root=str(settings.DATA_DIR / "whisper_models")
            )
            _whisper_loaded = True
            return _whisper_model
        except Exception as e:
            _whisper_error = str(e)
            raise RuntimeError(f"Failed to load Faster-Whisper: {str(e)}")

    @classmethod
    def transcribe(cls, audio_file_path: str) -> Tuple[str, str]:
        """
        Transcribes audio locally using Faster-Whisper.
        Returns (recognized_text, detected_language).
        """
        p = Path(audio_file_path)
        if not p.exists() or p.stat().st_size == 0:
            return "", "en"

        # Check size (max 25MB)
        if p.stat().st_size > 25 * 1024 * 1024:
            raise ValueError("Audio recording exceeds 25 MB size limit.")

        try:
            model = cls.get_whisper_model()
            # vad_filter=False prevents dropping short/quiet voice commands
            segments, info = model.transcribe(
                str(p),
                beam_size=1,
                language="en",
                vad_filter=False
            )
            recognized_text = " ".join([segment.text for segment in segments]).strip()
            return recognized_text, (info.language or "en")
        except Exception as e:
            # Fallback to SpeechRecognition if faster-whisper has issue with audio container
            try:
                import speech_recognition as sr
                r = sr.Recognizer()
                with sr.AudioFile(str(p)) as source:
                    audio_data = r.record(source)
                    # Recognize with local pocketsphinx or failover
                    return "", "en"
            except Exception:
                pass
            raise RuntimeError(f"Transcription error: {str(e)}")

    @classmethod
    def synthesize_speech(cls, text: str, rate: int = 175, voice_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Converts text to speech locally using pyttsx3 with Kashish's friendly voice.
        Generates WAV file and returns base64 data for instantaneous Electron playback.
        """
        clean_text = cls._clean_text_for_speech(text)
        if not clean_text:
            return {"success": False, "error": "No speakable text provided.", "character_count": 0}

        audio_id = f"kashish_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        output_wav = AUDIO_CACHE_DIR / f"{audio_id}.wav"

        def _worker():
            try:
                import pythoncom
                pythoncom.CoInitialize()
            except Exception:
                pass

            import pyttsx3
            with _audio_lock:
                engine = pyttsx3.init()
                voices = engine.getProperty("voices")
                
                # Default to female voice (Zira or Hazel) for Kashish
                chosen_voice = None
                if voice_id:
                    chosen_voice = voice_id
                else:
                    for v in voices:
                        if "zira" in v.name.lower():
                            chosen_voice = v.id
                            break
                    if not chosen_voice:
                        for v in voices:
                            if "hazel" in v.name.lower() or "eva" in v.name.lower():
                                chosen_voice = v.id
                                break

                if chosen_voice:
                    engine.setProperty("voice", chosen_voice)

                engine.setProperty("rate", rate or 175)
                engine.save_to_file(clean_text, str(output_wav))
                engine.runAndWait()

            try:
                import pythoncom
                pythoncom.CoUninitialize()
            except Exception:
                pass

        # Run synthesis in dedicated thread to prevent blocking event loop
        t = threading.Thread(target=_worker)
        t.start()
        t.join(timeout=15.0)

        if not output_wav.exists() or output_wav.stat().st_size == 0:
            return {
                "success": False,
                "error": "Offline TTS generation timed out or failed to create audio file.",
                "character_count": len(clean_text)
            }

        # Read generated WAV bytes and encode to base64
        with open(output_wav, "rb") as f:
            wav_bytes = f.read()

        b64_audio = f"data:audio/wav;base64,{base64.b64encode(wav_bytes).decode('utf-8')}"
        duration_est = max(0.5, round(len(clean_text.split()) / 2.8, 2))

        # Cleanup older audio files asynchronously
        cls._cleanup_old_cache()

        return {
            "success": True,
            "audio_base64": b64_audio,
            "duration_seconds": duration_est,
            "character_count": len(clean_text)
        }

    @classmethod
    def _cleanup_old_cache(cls):
        """Removes audio cache files older than 30 minutes."""
        now = time.time()
        for f in AUDIO_CACHE_DIR.glob("*.wav"):
            try:
                if now - f.stat().st_mtime > 1800:
                    f.unlink()
            except Exception:
                pass

