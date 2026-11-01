import json
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database.models import SettingRecord, ApprovedDirectory
from app.config import settings
from app.schemas.settings import (
    AllSettingsResponse,
    SettingsUpdateRequest,
    AddDirectoryRequest,
    ApprovedDirectoryItem
)

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=AllSettingsResponse)
def get_all_settings(db: Session = Depends(get_db)):
    # Load settings from DB
    records = {r.key: r.value for r in db.query(SettingRecord).all()}

    def get_val(key: str, default):
        raw = records.get(key)
        if raw is not None:
            try:
                return json.loads(raw)
            except Exception:
                return default
        return default

    dirs = db.query(ApprovedDirectory).all()
    dir_items = [
        ApprovedDirectoryItem(
            id=d.id,
            path=d.path,
            alias=d.alias,
            is_default=d.is_default
        )
        for d in dirs
    ]

    return AllSettingsResponse(
        ollama_endpoint=get_val("ollama_endpoint", settings.OLLAMA_HOST),
        selected_model=get_val("selected_model", settings.DEFAULT_MODEL),
        system_monitor_refresh_interval=get_val("system_monitor_refresh_interval", 3),
        max_file_size_mb=get_val("max_file_size_mb", 20),
        approved_directories=dir_items
    )

@router.post("")
def update_settings(req: SettingsUpdateRequest, db: Session = Depends(get_db)):
    updates = {}
    if req.ollama_endpoint is not None:
        clean_ep = req.ollama_endpoint.strip().rstrip("/")
        if not clean_ep.startswith("http://") and not clean_ep.startswith("https://"):
            raise HTTPException(status_code=400, detail="Endpoint must start with http:// or https://")
        updates["ollama_endpoint"] = clean_ep

    if req.selected_model is not None:
        updates["selected_model"] = req.selected_model.strip()

    if req.system_monitor_refresh_interval is not None:
        updates["system_monitor_refresh_interval"] = req.system_monitor_refresh_interval

    if req.max_file_size_mb is not None:
        updates["max_file_size_mb"] = req.max_file_size_mb

    for k, v in updates.items():
        rec = db.query(SettingRecord).filter_by(key=k).first()
        if rec:
            rec.value = json.dumps(v)
        else:
            db.add(SettingRecord(key=k, value=json.dumps(v)))

    db.commit()
    return {"success": True, "message": "Settings updated successfully."}

@router.post("/directories", response_model=ApprovedDirectoryItem)
def add_approved_directory(req: AddDirectoryRequest, db: Session = Depends(get_db)):
    clean_path = req.path.strip()
    try:
        p = Path(clean_path).resolve()
        if not p.exists() or not p.is_dir():
            raise HTTPException(status_code=400, detail=f"Directory '{p}' does not exist on this machine.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid directory path: {str(e)}")

    resolved_str = str(p)
    existing = db.query(ApprovedDirectory).filter_by(path=resolved_str).first()
    if existing:
        raise HTTPException(status_code=400, detail="This directory is already in the approved list.")

    new_dir = ApprovedDirectory(
        path=resolved_str,
        alias=req.alias.strip(),
        is_default=False
    )
    db.add(new_dir)
    db.commit()
    db.refresh(new_dir)

    return ApprovedDirectoryItem(
        id=new_dir.id,
        path=new_dir.path,
        alias=new_dir.alias,
        is_default=new_dir.is_default
    )

@router.delete("/directories/{dir_id}")
def remove_approved_directory(dir_id: int, db: Session = Depends(get_db)):
    d = db.query(ApprovedDirectory).filter_by(id=dir_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Directory not found.")
    
    # Don't allow deleting the default workspace
    if d.is_default and "workspace" in d.path.lower():
        raise HTTPException(status_code=400, detail="The default Nexus Workspace directory cannot be removed.")

    db.delete(d)
    db.commit()
    return {"success": True, "message": f"Directory '{d.alias}' removed."}

