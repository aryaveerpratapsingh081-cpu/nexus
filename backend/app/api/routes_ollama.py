import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database.models import SettingRecord
from app.config import settings
from app.ai.ollama_client import OllamaClient
from app.schemas.settings import OllamaStatusResponse

router = APIRouter(prefix="/ollama", tags=["Ollama"])

@router.get("/status", response_model=OllamaStatusResponse)
async def get_ollama_status(db: Session = Depends(get_db)):
    endpoint = settings.OLLAMA_HOST
    model = settings.DEFAULT_MODEL

    rec_ep = db.query(SettingRecord).filter_by(key="ollama_endpoint").first()
    if rec_ep and rec_ep.value:
        try:
            endpoint = json.loads(rec_ep.value)
        except Exception:
            pass

    rec_model = db.query(SettingRecord).filter_by(key="selected_model").first()
    if rec_model and rec_model.value:
        try:
            model = json.loads(rec_model.value)
        except Exception:
            pass

    return await OllamaClient.get_status(endpoint=endpoint, selected_model=model)

@router.get("/models")
async def get_ollama_models(db: Session = Depends(get_db)):
    status = await get_ollama_status(db)
    return {
        "is_available": status.is_available,
        "endpoint": status.endpoint,
        "models": status.models
    }

