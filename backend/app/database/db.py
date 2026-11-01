import json
import os
import shutil
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings
from app.database.models import Base, ApprovedDirectory, RegisteredApp, SettingRecord

DATABASE_URL = f"sqlite:///{settings.DATABASE_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    
    with SessionLocal() as db:
        # 1. Initialize default approved directories
        existing_dirs = db.query(ApprovedDirectory).count()
        if existing_dirs == 0:
            workspace_dir = settings.BASE_DIR / "workspace"
            workspace_dir.mkdir(parents=True, exist_ok=True)
            
            candidates = [
                (workspace_dir, "Nexus Workspace", True),
                (settings.USER_HOME / "Documents", "My Documents", True),
                (settings.USER_HOME / "Downloads", "My Downloads", True),
                (settings.USER_HOME / "Desktop", "My Desktop", True),
            ]
            for p, alias, is_def in candidates:
                try:
                    if p.exists() and p.is_dir():
                        resolved = str(p.resolve())
                        # Check duplicate
                        if not db.query(ApprovedDirectory).filter_by(path=resolved).first():
                            db.add(ApprovedDirectory(path=resolved, alias=alias, is_default=is_def))
                except Exception:
                    pass
            db.commit()

        # 2. Initialize default registered allowlisted applications
        existing_apps = db.query(RegisteredApp).count()
        if existing_apps == 0:
            system_root = os.environ.get("SystemRoot", r"C:\Windows")
            local_appdata = os.environ.get("LOCALAPPDATA", str(settings.USER_HOME / "AppData" / "Local"))
            
            default_apps = [
                {
                    "id": "notepad",
                    "name": "Notepad",
                    "path": os.path.join(system_root, "System32", "notepad.exe"),
                    "category": "Productivity",
                    "icon": "FileText",
                    "is_builtin": True
                },
                {
                    "id": "calculator",
                    "name": "Calculator",
                    "path": os.path.join(system_root, "System32", "calc.exe"),
                    "category": "Utilities",
                    "icon": "Calculator",
                    "is_builtin": True
                },
                {
                    "id": "mspaint",
                    "name": "Paint",
                    "path": os.path.join(system_root, "System32", "mspaint.exe"),
                    "category": "Graphics",
                    "icon": "Palette",
                    "is_builtin": True
                },
                {
                    "id": "vscode",
                    "name": "Visual Studio Code",
                    "path": os.path.join(local_appdata, "Programs", "Microsoft VS Code", "Code.exe"),
                    "category": "Development",
                    "icon": "Code2",
                    "is_builtin": False
                }
            ]
            
            for app_meta in default_apps:
                p = Path(app_meta["path"])
                # Even if vscode is not present at that exact path, notepad and calc definitely are
                if p.exists() or app_meta["id"] in ("notepad", "calculator"):
                    # Check if already added
                    if not db.query(RegisteredApp).filter_by(id=app_meta["id"]).first():
                        db.add(RegisteredApp(
                            id=app_meta["id"],
                            name=app_meta["name"],
                            executable_path=str(p) if p.exists() else app_meta["path"],
                            category=app_meta["category"],
                            icon=app_meta["icon"],
                            is_builtin=app_meta["is_builtin"]
                        ))
            db.commit()

        # 3. Initialize default settings
        default_settings = {
            "ollama_endpoint": settings.OLLAMA_HOST,
            "selected_model": settings.DEFAULT_MODEL,
            "system_monitor_refresh_interval": 3,
            "max_file_size_mb": 20,
        }
        for k, v in default_settings.items():
            if not db.query(SettingRecord).filter_by(key=k).first():
                db.add(SettingRecord(key=k, value=json.dumps(v)))
        db.commit()

